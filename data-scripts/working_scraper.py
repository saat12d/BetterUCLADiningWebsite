from playwright.async_api import async_playwright
import asyncio
import json

async def scrape_bruin_plate_meals():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Set to False to see browser
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto("https://dining.ucla.edu/bruin-plate/")
        await page.wait_for_selector('button:has-text("Change")')
        await page.click('button:has-text("Change")')

        meal_types = ["Breakfast", "Lunch", "Dinner"]
        data = {}

        for meal in meal_types:
            # Select meal type
            await page.wait_for_selector('#menu-type')
            await page.select_option('#menu-type', label=meal)

            # Click Done
            await page.click('.done-button')
            await page.wait_for_timeout(1500)  # crude wait for now

            # Parse content
            meal_data = {}
            sections = await page.locator('div#menu-body > div').all()

            for section in sections:
                section_title = await section.locator('h2.category-heading').text_content()
                recipes = []

                cards = section.locator('section.recipe-card')
                for i in range(await cards.count()):
                    card = cards.nth(i)
                    name = await card.locator('.recipe-name').text_content()
                    cal_text = await card.locator('.recipe-calories').text_content()
                    calories = int(cal_text.split()[0]) if cal_text else None

                    tags = []
                    metadata_icons = card.locator('.recipe-metadata-item')
                    for j in range(await metadata_icons.count()):
                        tag = await metadata_icons.nth(j).get_attribute("title")
                        if tag:
                            tags.append(tag)

                    recipes.append({
                        "name": name,
                        "calories": calories,
                        "tags": tags
                    })

                meal_data[section_title] = recipes

            data[meal] = meal_data

            # Open modal for next meal
            if meal != meal_types[-1]:
                await page.click('button:has-text("Change")')

        await browser.close()

        # Save to JSON
        with open("bruin_plate_menu.json", "w") as f:
            json.dump(data, f, indent=2)

        print("✅ Data saved to bruin_plate_menu.json")

asyncio.run(scrape_bruin_plate_meals())