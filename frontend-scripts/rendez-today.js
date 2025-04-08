import { tagIcons } from './constants.js'

let menuData = null;
let recipesData = null;
let ingredientsData = null;

function formatDate(dateStr) {
  // Split the date string into components
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
  // Create date object using local time (months are 0-based in JavaScript)
  const date = new Date(year, month - 1, day);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', dateStr);
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function getTodayDateKey() {
  const now = new Date();
  // Ensure we're using local time, not UTC
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  console.log('Today\'s date key:', dateKey);
  return dateKey;
}

function findClosestDate(dates, targetDate) {
  console.log('Finding closest date to:', targetDate);
  console.log('Available dates:', dates);
  
  // Convert target date to timestamp
  const targetTime = new Date(targetDate).getTime();
  
  // Sort dates by their difference from target date
  const sortedDates = dates.sort((a, b) => {
    const diffA = Math.abs(new Date(a).getTime() - targetTime);
    const diffB = Math.abs(new Date(b).getTime() - targetTime);
    return diffA - diffB;
  });

  console.log('Closest date found:', sortedDates[0]);
  return sortedDates[0];
}

/**
 * Get allergen information from recipe data
 */
function getRecipeAllergens(recipeId) {
  if (!recipesData || !recipesData[recipeId]) {
    return [];
  }
  
  const recipe = recipesData[recipeId];
  if (!recipe.recipeAllergens) {
    return [];
  }
  
  return recipe.recipeAllergens.map(allergen => allergen.allergenName);
}

/**
 * Get calories from recipe data
 */
function getRecipeCalories(recipeId) {
  if (!recipesData || !recipesData[recipeId]) {
    return null;
  }
  
  const recipe = recipesData[recipeId];
  if (!recipe.recipeNutritiveValues || !recipe.recipeNutritiveValues.energyKcal) {
    return null;
  }
  
  return Math.round(recipe.recipeNutritiveValues.energyKcal.value);
}

/**
 * Get recipe name from translations
 */
function getRecipeDisplayName(recipeId, menuRowName) {
  // If no recipeId, use menuRowName
  if (!recipeId) {
    return menuRowName || 'Unknown Item';
  }

  if (!recipesData || !recipesData[recipeId]) {
    return menuRowName || 'Unknown Item';
  }
  
  const recipe = recipesData[recipeId];
  // If there are translations, use the English translation
  if (recipe.recipeNameTranslations && recipe.recipeNameTranslations.EN) {
    return recipe.recipeNameTranslations.EN;
  }
  // Fallback to recipe name
  return recipe.recipeName || menuRowName || 'Unknown Item';
}

/**
 * Get nutritional information from recipe or ingredient data
 */
function getNutritionalInfo(recipeId, menuRowName) {
  // First try to get nutrition from recipe
  if (recipesData && recipesData[recipeId] && recipesData[recipeId].recipeNutritiveValues) {
    const nutrition = recipesData[recipeId].recipeNutritiveValues;
    return {
      calories: Math.round(nutrition.energyKcal?.value || 0),
      protein: Math.round(nutrition.protein?.value || 0),
      carbs: Math.round(nutrition.carbohydrate?.value || 0),
      fat: Math.round(nutrition.fat?.value || 0),
      fiber: Math.round(nutrition.fiber?.value || 0),
      sugar: Math.round(nutrition.sugar?.value || 0),
      sodium: Math.round(nutrition.sodium?.value || 0)
    };
  }

  // If no recipe data, try to find matching ingredient
  if (ingredientsData && menuRowName) {
    // Clean up the menu row name to match ingredient names
    const cleanName = menuRowName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim();

    // Search for matching ingredient
    const matchingIngredient = Object.values(ingredientsData).find(ingredient => {
      const ingredientName = ingredient.ingredientName
        ?.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      return ingredientName && (ingredientName.includes(cleanName) || cleanName.includes(ingredientName));
    });

    if (matchingIngredient && matchingIngredient.ingredientNutritiveValues) {
      const nutrition = matchingIngredient.ingredientNutritiveValues;
      return {
        calories: Math.round(nutrition.energyKcal || 0),
        protein: Math.round(nutrition.protein || 0),
        carbs: Math.round(nutrition.carbohydrate || 0),
        fat: Math.round(nutrition.fat || 0),
        fiber: Math.round(nutrition.fibre || 0), // Note: ingredient data uses 'fibre' instead of 'fiber'
        sugar: Math.round(nutrition.sugars || 0), // Note: ingredient data uses 'sugars' instead of 'sugar'
        sodium: Math.round(nutrition.sodium || 0)
      };
    }
  }

  return null;
}

/**
 * Get ingredients list from recipe data
 */
function getIngredientsList(recipeId) {
  if (!recipesData || !recipesData[recipeId]) {
    return null;
  }
  
  const recipe = recipesData[recipeId];
  if (!recipe.recipeListOfIngredientsTranslations || !recipe.recipeListOfIngredientsTranslations.EN) {
    return null;
  }
  
  // Get the English translation of ingredients
  const ingredientsText = recipe.recipeListOfIngredientsTranslations.EN;
  
  // Split by commas and clean up each ingredient
  const ingredients = ingredientsText
    .split(',')
    .map(ingredient => {
      // Remove HTML tags and trim whitespace
      return ingredient
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\([^)]*\)/g, '') // Remove parenthetical allergen info
        .trim();
    })
    .filter(ingredient => ingredient.length > 0); // Remove empty ingredients
  
  return ingredients.length > 0 ? ingredients : null;
}

/**
 * Get portion size from recipe or ingredient data
 */
function getPortionSize(recipeId, menuRowName, menuRowPortionSize, menuRowPortionSizeUnit) {
  // First try to get portion size from menu data
  if (menuRowPortionSize && menuRowPortionSizeUnit) {
    return { size: menuRowPortionSize, unit: menuRowPortionSizeUnit };
  }
  
  // Try to get portion size from recipe
  if (recipesData && recipesData[recipeId] && recipesData[recipeId].recipeNutritiveValues) {
    const portionSize = recipesData[recipeId].recipeNutritiveValues.portionSize;
    const portionUnit = recipesData[recipeId].recipeNutritiveValues.portitionSizeUnit;
    if (portionSize && portionUnit) {
      return { size: portionSize, unit: portionUnit };
    }
  }
  
  // Try to get portion size from ingredient
  if (ingredientsData && menuRowName) {
    // Clean up the menu row name to match ingredient names
    const cleanName = menuRowName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim();

    // Search for matching ingredient
    const matchingIngredient = Object.values(ingredientsData).find(ingredient => {
      const ingredientName = ingredient.ingredientName
        ?.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      return ingredientName && (ingredientName.includes(cleanName) || cleanName.includes(ingredientName));
    });

    if (matchingIngredient && matchingIngredient.ingredientNutritiveValues) {
      const portionSize = matchingIngredient.ingredientNutritiveValues.portion;
      const portionUnit = matchingIngredient.ingredientNutritiveValues.portionUnit;
      if (portionSize && portionUnit) {
        return { size: portionSize, unit: portionUnit };
      }
    }
  }
  
  // Default portion size if none found
  return { size: 1, unit: 'serving' };
}

/**
 * Render the given meal data, preserving each section/station as a subheading.
 */
function renderMealSections(mealData, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // Clear existing content

  if (!mealData || Object.keys(mealData).length === 0) {
    container.textContent = 'No data available for this meal.';
    return;
  }

  // Filter out empty categories
  const nonEmptyCategories = Object.keys(mealData).filter(category => 
    mealData[category] && mealData[category].length > 0
  );

  if (nonEmptyCategories.length === 0) {
    container.textContent = 'No menu items available for this meal.';
    return;
  }

  // For each station/section in the meal data, add a heading + list of items
  nonEmptyCategories.forEach(sectionName => {
    const sectionEl = document.createElement('div');

    // Subheading for the station
    const heading = document.createElement('h3');
    heading.className = 'section-heading';
    heading.textContent = sectionName;
    sectionEl.appendChild(heading);

    // The list of recipes
    const ul = document.createElement('ul');
    mealData[sectionName].forEach(menuItem => {
      const li = document.createElement('li');
      li.className = 'menu-item';
      
      // Create the main item container
      const itemContainer = document.createElement('div');
      itemContainer.className = 'menu-item-container';
      itemContainer.dataset.recipeId = menuItem.recipeId;
      itemContainer.dataset.menuRowName = menuItem.menuRowName;
      
      // Create the name section
      const nameSection = document.createElement('div');
      nameSection.className = 'menu-item-name-section';
      
      const name = document.createElement('span');
      name.className = 'menu-item-name';
      
      // Get recipe details
      const recipeId = menuItem.recipeId;
      const recipeName = getRecipeDisplayName(recipeId, menuItem.menuRowName);
      const nutrition = getNutritionalInfo(recipeId, menuItem.menuRowName);
      const portionSize = getPortionSize(recipeId, menuItem.menuRowName, menuItem.menuRowPortionSize, menuItem.menuRowPortionSizeUnit);
      
      // Set the name
      name.textContent = recipeName;
      nameSection.appendChild(name);

      // Create a tag icon group for allergens
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag-icons';
    
      // Get allergens from recipe
      const allergens = getRecipeAllergens(recipeId);
      const allergenIcons = [];
      
      if (allergens && allergens.length > 0) {
        allergens.forEach(allergen => {
          // Map allergen names to tag names
          let tagName = allergen;
          if (allergen === "Gluten") tagName = "Gluten";
          else if (allergen === "Dairy") tagName = "Dairy";
          else if (allergen === "Eggs") tagName = "Eggs";
          else if (allergen === "Soy") tagName = "Soy";
          else if (allergen === "Peanut") tagName = "Peanut";
          else if (allergen === "Tree-Nuts") tagName = "Tree-Nuts";
          else if (allergen === "Fish") tagName = "Fish";
          else if (allergen === "Crustacean-Shellfish") tagName = "Crustacean-Shellfish";
          else if (allergen === "Sesame") tagName = "Sesame";
          
          const iconPath = tagIcons[tagName];
          if (iconPath) {
            const iconImg = document.createElement('img');
            iconImg.src = iconPath;
            iconImg.alt = allergen;
            iconImg.title = allergen;
            iconImg.className = 'tag-icon-img';
            allergenIcons.push(iconImg);
          }
        });
      }

      // Add nutrition info button if nutrition data is available
      if (nutrition || allergens.length > 0) {
        const nutritionButton = document.createElement('button');
        nutritionButton.className = 'nutrition-button';
        nutritionButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        nutritionButton.title = 'View Nutrition Info';
        
        // Create nutrition details section
        const nutritionDetails = document.createElement('div');
        nutritionDetails.className = 'nutrition-details';
        
        let nutritionContent = '<div class="nutrition-grid">';
        
        // Add nutrition info if available
        if (nutrition) {
          nutritionContent += `
            <div class="nutrition-item">
              <span class="nutrition-label">Calories</span>
              <span class="nutrition-value">${nutrition.calories} Cal</span>
            </div>
            <div class="nutrition-item">
              <span class="nutrition-label">Protein</span>
              <span class="nutrition-value">${nutrition.protein}g</span>
            </div>
            <div class="nutrition-item">
              <span class="nutrition-label">Carbs</span>
              <span class="nutrition-value">${nutrition.carbs}g</span>
            </div>
            <div class="nutrition-item">
              <span class="nutrition-label">Fat</span>
              <span class="nutrition-value">${nutrition.fat}g</span>
            </div>
            <div class="nutrition-item">
              <span class="nutrition-label">Fiber</span>
              <span class="nutrition-value">${nutrition.fiber}g</span>
            </div>
            <div class="nutrition-item">
              <span class="nutrition-label">Sugar</span>
              <span class="nutrition-value">${nutrition.sugar}g</span>
            </div>
            <div class="nutrition-item">
              <span class="nutrition-label">Sodium</span>
              <span class="nutrition-value">${nutrition.sodium}mg</span>
            </div>
          `;
        }
        
        // Add ingredients section if available
        const ingredients = getIngredientsList(recipeId);
        if (ingredients && ingredients.length > 0) {
          nutritionContent += `
            <div class="nutrition-item ingredients-section">
              <span class="nutrition-label">Ingredients</span>
              <div class="ingredients-list">
                ${ingredients.map(ingredient => `<span class="ingredient-item">${ingredient}</span>`).join('')}
              </div>
            </div>
          `;
        }
        
        // Add allergens section if there are any allergens
        if (allergens.length > 0) {
          nutritionContent += `
            <div class="nutrition-item allergens-section">
              <span class="nutrition-label">Allergens</span>
              <div class="allergen-icons">
                ${allergenIcons.map(icon => icon.outerHTML).join('')}
              </div>
            </div>
          `;
        }
        
        nutritionContent += '</div>';
        nutritionDetails.innerHTML = nutritionContent;
        
        // Add click handler for nutrition button
        nutritionButton.addEventListener('click', () => {
          nutritionDetails.classList.toggle('show');
          nutritionButton.classList.toggle('active');
        });
        
        itemContainer.appendChild(nameSection);
        
        // Show allergen icons in main view if there are 2 or fewer
        if (allergens.length <= 2) {
          allergenIcons.forEach(icon => tagSpan.appendChild(icon));
        } else {
          // Show only first 2 allergen icons in main view if there are more than 2
          allergenIcons.slice(0, 2).forEach(icon => tagSpan.appendChild(icon));
          const moreIcon = document.createElement('span');
          moreIcon.className = 'more-allergens';
          moreIcon.textContent = '...';
          moreIcon.title = 'More allergens';
          tagSpan.appendChild(moreIcon);
        }
        
        itemContainer.appendChild(tagSpan);
        itemContainer.appendChild(nutritionButton);
        li.appendChild(itemContainer);
        li.appendChild(nutritionDetails);
      } else {
        itemContainer.appendChild(nameSection);
        itemContainer.appendChild(tagSpan);
        li.appendChild(itemContainer);
      }
      
      ul.appendChild(li);
    });

    sectionEl.appendChild(ul);
    container.appendChild(sectionEl);
  });
}

function populateDateSelector(dates) {
  const selector = document.getElementById('date-picker');
  selector.innerHTML = ''; // Clear existing options
  
  dates.forEach(date => {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = formatDate(date);
    selector.appendChild(option);
  });
}

function updateMenuDisplay(dateKey) {
  // Update the date in the header
  const dateDisplay = document.getElementById('selected-date');
  console.log('Updating date display to:', dateKey);
  dateDisplay.textContent = formatDate(dateKey);
  console.log('Date display updated to:', dateDisplay.textContent);

  // Update the menu content
  const dayData = menuData[dateKey];
  console.log(dayData);
  if (!dayData) {
    console.warn(`No menu data for date = ${dateKey}`);
    document.getElementById('lunch').textContent = 'No data available for this date.';
    return;
  }

  // Find Rendezvous data in the menu
  const rendezMenu = dayData.find(venue => 
    venue && venue.menuName && venue.menuName === "Rendezvous Online Menu 4 Week Cycle"
  );

  console.log(rendezMenu);
  if (!rendezMenu) {
    document.getElementById('lunch').textContent = 'No Rendezvous data available for this date.';
    return;
  }

  // Process menu data for lunch
  const processedData = {};

  // Process the Rendezvous menu
  if (!rendezMenu.menuWeeks || !Array.isArray(rendezMenu.menuWeeks)) {
    document.getElementById('lunch').textContent = 'No menu data available for Rendezvous.';
    return;
  }
  
  rendezMenu.menuWeeks.forEach(week => {
    if (!week || !week.menuDays || !Array.isArray(week.menuDays)) return;
    
    week.menuDays.forEach(day => {
      if (!day || !day.menuDayMealOptions || !Array.isArray(day.menuDayMealOptions)) return;
      
      day.menuDayMealOptions.forEach(mealOption => {
        if (!mealOption || !mealOption.menuRows || !Array.isArray(mealOption.menuRows)) return;
        
        // Skip the "Boba Drinks" section
        if (mealOption.mealOptionName === "BOBA DRINKS") {
          return;
        }
        
        // Rename "Drinks" to "Beverages"
        let categoryName = mealOption.mealOptionName || "Main Station";
        if (categoryName === "DRINKS") {
          categoryName = "LATIN TOPPING BAR";
        }
        if (categoryName === "ASIAN SAUCE") {
          categoryName = "ASIAN SIDES";
        }
        if (categoryName === "CONDIMENT ACI") {
          categoryName = "BOBA DRINKS";
        }
        
        if (!processedData[categoryName]) {
          processedData[categoryName] = [];
        }
        
        // Add menu items to the category
        mealOption.menuRows.forEach(row => {
          if (!row) return;
          
          processedData[categoryName].push({
            menuRowName: row.menuRowName,
            recipeId: row.recipeId,
            menuRowPortionSize: row.menuRowPortionSize,
            menuRowPortionSizeUnit: row.menuRowPortionSizeUnit
          });
        });
      });
    });
  });

  // Render lunch section
  renderMealSections(processedData, 'lunch');
}

async function loadMenuData() {
  try {
    // Fetch the menu data
    const menuResponse = await fetch('data/menu_data.json');
    menuData = await menuResponse.json();
    
    // Fetch the recipes data
    const recipesResponse = await fetch('data/recipes.json');
    recipesData = await recipesResponse.json();
    
    // Fetch the ingredients data
    const ingredientsResponse = await fetch('data/ingredients.json');
    ingredientsData = await ingredientsResponse.json();

    // Get all available dates and sort them
    const dates = Object.keys(menuData).sort();
    console.log('Available menu dates:', dates);
    
    // Populate the date selector
    populateDateSelector(dates);

    // Get today's date
    const todayKey = getTodayDateKey();
    console.log('Looking for today\'s menu:', todayKey);
    console.log('Menu data available for today?', !!menuData[todayKey]);
    
    // If today's menu is available, use it
    // Otherwise, find the closest available date
    const initialDate = menuData[todayKey] ? todayKey : findClosestDate(dates, todayKey);
    console.log('Selected initial date:', initialDate);
    
    // Set the selected date in the dropdown
    const datePicker = document.getElementById('date-picker');
    datePicker.value = initialDate;
    console.log('Date picker value set to:', datePicker.value);
    
    // Display the menu for the initial date
    updateMenuDisplay(initialDate);

  } catch (err) {
    console.error('Error fetching data:', err);
    document.getElementById('selected-date').textContent = 'Error loading menu data';
  }
}

function initialize() {
  // Load initial menu data
  loadMenuData();

  // Add event listener for date changes
  document.getElementById('date-picker').addEventListener('change', (e) => {
    updateMenuDisplay(e.target.value);
  });
}

document.addEventListener('DOMContentLoaded', initialize);
  