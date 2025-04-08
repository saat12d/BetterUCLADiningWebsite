import requests
import json
from datetime import datetime, timedelta
import os
import logging
from typing import Dict, Any, Set

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def fetch_recipe_data(recipe_id: int) -> Dict[str, Any]:
    """
    Fetch detailed recipe data from UCLA dining API
    
    Args:
        recipe_id (int): Recipe ID
        
    Returns:
        dict: Recipe data
    """
    url = f"https://dining.ucla.edu/wp-content/uploads/jamix/recipes/{recipe_id}.json"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        logger.error(f"Error fetching recipe data for ID {recipe_id}: {str(e)}")
        return None

def fetch_ingredient_data(ingredient_id: int) -> Dict[str, Any]:
    """
    Fetch detailed ingredient data from UCLA dining API
    
    Args:
        ingredient_id (int): Ingredient ID
        
    Returns:
        dict: Ingredient data
    """
    url = f"https://dining.ucla.edu/wp-content/uploads/jamix/ingredients/{ingredient_id}.json"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        logger.error(f"Error fetching ingredient data for ID {ingredient_id}: {str(e)}")
        return None

def extract_ids_from_menu(menu_data: list) -> tuple[Set[int], Set[int]]:
    """
    Extract recipe and ingredient IDs from menu data
    
    Args:
        menu_data (list): Raw menu data
        
    Returns:
        tuple: Sets of recipe and ingredient IDs
    """
    recipe_ids = set()
    ingredient_ids = set()
    
    try:
        for menu in menu_data:
            if not isinstance(menu, dict):
                continue
                
            for week in menu.get('menuWeeks', []):
                for day in week.get('menuDays', []):
                    for meal_option in day.get('menuDayMealOptions', []):
                        for row in meal_option.get('menuRows', []):
                            if 'recipeId' in row:
                                recipe_ids.add(row['recipeId'])
                            if 'ingredientId' in row:
                                ingredient_ids.add(row['ingredientId'])
                                
        return recipe_ids, ingredient_ids
    except Exception as e:
        logger.error(f"Error extracting IDs from menu: {str(e)}")
        return set(), set()

def fetch_menu_data(date_str: str) -> Dict[str, Any]:
    """
    Fetch menu data for a specific date
    
    Args:
        date_str (str): Date in YYYY-MM-DD format
        
    Returns:
        dict: Menu data and sets of recipe/ingredient IDs
    """
    url = f"https://dining.ucla.edu/wp-content/uploads/jamix/menus/{date_str}.json"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        menu_data = response.json()
        
        # Extract recipe and ingredient IDs
        recipe_ids, ingredient_ids = extract_ids_from_menu(menu_data)
        
        return {
            "menu": menu_data,
            "recipe_ids": recipe_ids,
            "ingredient_ids": ingredient_ids
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data for {date_str}: {str(e)}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON for {date_str}: {str(e)}")
        return None

def fetch_menus_for_date_range(start_date: datetime, end_date: datetime) -> tuple[Dict[str, Any], Set[int], Set[int]]:
    """
    Fetch menu data and collect all recipe/ingredient IDs for a range of dates
    
    Args:
        start_date (datetime): Start date
        end_date (datetime): End date
        
    Returns:
        tuple: (menu data, all recipe IDs, all ingredient IDs)
    """
    all_data = {}
    all_recipe_ids = set()
    all_ingredient_ids = set()
    
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        logger.info(f"Fetching menu data for {date_str}...")
        
        result = fetch_menu_data(date_str)
        if result:
            all_data[date_str] = result["menu"]
            all_recipe_ids.update(result["recipe_ids"])
            all_ingredient_ids.update(result["ingredient_ids"])
        else:
            logger.warning(f"No data available for {date_str}")
            
        current_date += timedelta(days=1)
        
    return all_data, all_recipe_ids, all_ingredient_ids

def fetch_and_save_recipes(recipe_ids: Set[int], output_file: str) -> None:
    """
    Fetch and save recipe data
    
    Args:
        recipe_ids (Set[int]): Set of recipe IDs
        output_file (str): Path to output file
    """
    recipes = {}
    
    for recipe_id in recipe_ids:
        logger.info(f"Fetching recipe data for ID {recipe_id}...")
        recipe_data = fetch_recipe_data(recipe_id)
        if recipe_data:
            recipes[recipe_id] = recipe_data
            
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(recipes, f, indent=2, ensure_ascii=False)
        logger.info(f"Recipe data saved to {output_file}")
    except Exception as e:
        logger.error(f"Error saving recipe data: {str(e)}")

def fetch_and_save_ingredients(ingredient_ids: Set[int], output_file: str) -> None:
    """
    Fetch and save ingredient data
    
    Args:
        ingredient_ids (Set[int]): Set of ingredient IDs
        output_file (str): Path to output file
    """
    ingredients = {}
    
    for ingredient_id in ingredient_ids:
        logger.info(f"Fetching ingredient data for ID {ingredient_id}...")
        ingredient_data = fetch_ingredient_data(ingredient_id)
        if ingredient_data:
            ingredients[ingredient_id] = ingredient_data
            
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(ingredients, f, indent=2, ensure_ascii=False)
        logger.info(f"Ingredient data saved to {output_file}")
    except Exception as e:
        logger.error(f"Error saving ingredient data: {str(e)}")

def save_menu_data(data: Dict[str, Any], output_file: str) -> None:
    """
    Save menu data to a JSON file
    
    Args:
        data (dict): Menu data to save
        output_file (str): Path to output file
    """
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Menu data saved to {output_file}")
    except Exception as e:
        logger.error(f"Error saving menu data: {str(e)}")

def main():
    # Set date range (e.g., next 7 days)
    start_date = datetime.now()
    end_date = start_date + timedelta(days=5)
    
    # Create data directory if it doesn't exist
    data_dir = '../data'
    os.makedirs(data_dir, exist_ok=True)
    
    # Fetch menu data and collect IDs
    menu_data, recipe_ids, ingredient_ids = fetch_menus_for_date_range(start_date, end_date)
    
    # Save menu data
    menu_file = os.path.join(data_dir, 'menu_data.json')
    save_menu_data(menu_data, menu_file)
    
    # Fetch and save recipe data
    recipe_file = os.path.join(data_dir, 'recipes.json')
    fetch_and_save_recipes(recipe_ids, recipe_file)
    
    # Fetch and save ingredient data
    ingredient_file = os.path.join(data_dir, 'ingredients.json')
    fetch_and_save_ingredients(ingredient_ids, ingredient_file)

if __name__ == '__main__':
    main() 