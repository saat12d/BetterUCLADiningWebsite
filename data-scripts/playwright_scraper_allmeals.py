from playwright.async_api import async_playwright
import asyncio
import json

async def scrape_bruin_plate_meals():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Set to False if you want to watch
        context = await browser.new_context()
        page = await context.new_page()

        # Go to Bruin Plate menu
        await page.goto("https://dining.ucla.edu/epicuria-at-covel/")
        # Wait for and click the 'Change' button to open the date/meal modal
        await page.wait_for_selector('button:has-text("Change")')
        await page.click('button:has-text("Change")')

        # Grab all date <option> elements
        date_options = page.locator('#menu-date option')
        date_count = await date_options.count()

        # The meal types we want to fetch
        meal_types = ["Breakfast", "Lunch", "Dinner"]

        # Master dictionary that will hold all data across all dates
        all_data = {}

        for date_index in range(date_count):
            # Get the value attribute (e.g. "2025-03-30") of the nth option
            date_option = date_options.nth(date_index)
            date_value = await date_option.get_attribute('value')

            # Select this date from the dropdown
            await page.select_option('#menu-date', value=date_value)

            # We'll create a dictionary for this single date
            date_data = {}

            for i, meal in enumerate(meal_types):
                # Select meal from the dropdown
                await page.select_option('#menu-type', label=meal)

                # Click "Done" to apply date & meal selection
                await page.click('.done-button')
                # Wait a moment for the menu content to load
                await page.wait_for_timeout(1500)

                # Now parse the menu content for this date & meal
                meal_data = {}
                sections = await page.locator('div#menu-body > div').all()

                for section in sections:
                    section_title = await section.locator('h2.category-heading').text_content()
                    recipes = []

                    cards = section.locator('section.recipe-card')
                    for card_index in range(await cards.count()):
                        card = cards.nth(card_index)
                        name = await card.locator('.recipe-name').text_content() or ""
                        cal_text = await card.locator('.recipe-calories').text_content() or ""
                        # Try to parse the first integer from "XXX Calories"
                        try:
                            calories = int(cal_text.split()[0])
                        except (ValueError, IndexError):
                            calories = None

                        # Gather metadata tags
                        tags = []
                        metadata_icons = card.locator('.recipe-metadata-item')
                        for j in range(await metadata_icons.count()):
                            tag = await metadata_icons.nth(j).get_attribute("title")
                            if tag:
                                tags.append(tag)

                        recipes.append({
                            "name": name.strip(),
                            "calories": calories,
                            "tags": tags
                        })

                    meal_data[section_title] = recipes

                # Save parsed meal data for this meal
                date_data[meal] = meal_data

                # If we still have more meals to fetch for the same date,
                # we need to re-open the modal
                if i < len(meal_types) - 1:
                    await page.click('button:has-text("Change")')

            # Finished collecting for this date, store it under date_value
            all_data[date_value] = date_data

            # If there are still more dates to process, open the modal again
            if date_index < date_count - 1:
                await page.click('button:has-text("Change")')

        # Close the browser
        await browser.close()

        # Save all_data to JSON
        with open("epicuria_menu.json", "w") as f:
            json.dump(all_data, f, indent=2)

        print("✅ Data saved to bruin_plate_menu.json")

# Run the async scraper
if __name__ == "__main__":
    asyncio.run(scrape_bruin_plate_meals())
