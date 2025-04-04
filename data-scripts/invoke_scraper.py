from playwright.async_api import async_playwright
import asyncio
import json

async def scrape_dining_hall(url, output_file):
    """
    Scrape menu data for a dining hall
    
    Args:
        url (str): URL of the dining hall menu page
        output_file (str): Path to save the JSON output
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Go to dining hall menu
        await page.goto(url)
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
        with open(output_file, "w") as f:
            json.dump(all_data, f, indent=2)

        print(f"✅ Data saved to {output_file}")

async def scrape_all_dining_halls():
    """Scrape menu data for all UCLA dining halls"""
    
    # Define dining halls with their URLs and output files
    dining_halls = [
        {
            "name": "Bruin Plate",
            "url": "https://dining.ucla.edu/bruin-plate/",
            "output": "../data/bruin_plate_menu.json"
        },
        {
            "name": "De Neve",
            "url": "https://dining.ucla.edu/de-neve-dining/",
            "output": "../data/deneve_menu.json"
        },
        # {
        #     "name": "Epicuria",
        #     "url": "https://dining.ucla.edu/epicuria-at-covel/",
        #     "output": "../data/epicuria_menu.json"
        # },
        {
            "name": "Epicuria at Ackerman",
            "url": "https://dining.ucla.edu/epicuria-ackerman/",
            "output": "../data/epic_at_ackerman_menu.json"
        },
        {
            "name": "Rendezvous",
            "url": "https://dining.ucla.edu/rendezvous/",
            "output": "../data/rendez_menu.json"
        },
        {
            "name": "BCafe",
            "url": "https://dining.ucla.edu/bruin-cafe/",
            "output": "../data/bcafe_menu.json"
        },
        {
            "name": "Cafe 1919",
            "url": "https://dining.ucla.edu/cafe-1919/",
            "output": "../data/1919_menu.json"
        }
    ]

    # Scrape each dining hall
    for hall in dining_halls:
        print(f"\n🔄 Scraping {hall['name']}...")
        try:
            await scrape_dining_hall(hall['url'], hall['output'])
            print(f"✅ Successfully scraped {hall['name']}")
        except Exception as e:
            print(f"❌ Error scraping {hall['name']}: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting UCLA Dining Hall Menu Scraper")
    asyncio.run(scrape_all_dining_halls())
    print("\n✨ All scraping tasks completed!") 