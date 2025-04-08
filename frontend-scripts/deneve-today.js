// scripts/bplate-today.js
import { tagIcons } from './constants.js'

let menuData = null;
let recipesData = null;
let ingredientsData = null;
let isCalorieCounterEnabled = false;
let selectedItems = [];

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
  return dateKey;
}

function findClosestDate(dates, targetDate) {
  // Convert target date to timestamp
  const targetTime = new Date(targetDate).getTime();
  
  // Sort dates by their difference from target date
  const sortedDates = dates.sort((a, b) => {
    const diffA = Math.abs(new Date(a).getTime() - targetTime);
    const diffB = Math.abs(new Date(b).getTime() - targetTime);
    return diffA - diffB;
  });

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
  
    // For each station/section in the meal data, add a heading + list of items
    Object.keys(mealData).forEach(sectionName => {
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
      
      // Add portion size display only when calorie counter is enabled
      if (isCalorieCounterEnabled) {
        const portionDisplay = document.createElement('span');
        portionDisplay.className = 'portion-size';
        portionDisplay.textContent = `${portionSize.size}${portionSize.unit}`;
        nameSection.appendChild(portionDisplay);
      }

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
  
      // Check if this item is in the selected items
      const selectedItem = selectedItems.find(item => 
        item.recipeId === recipeId && 
        item.menuRowName === menuItem.menuRowName
      );
      
      if (isCalorieCounterEnabled) {
        // Add portion counter
        const portionCounter = document.createElement('div');
        portionCounter.className = 'portion-counter';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.addEventListener('click', () => {
          handlePortionCounterClick({
            recipeId,
            menuRowName: menuItem.menuRowName,
            name: recipeName,
            nutrition,
            portionSize
          }, false);
          // Update the counter display after the portion count has been updated
          const updatedItem = selectedItems.find(item => 
            item.recipeId === recipeId && 
            item.menuRowName === menuItem.menuRowName
          );
          countSpan.textContent = updatedItem ? updatedItem.portionCount : '0';
        });
        
        const countSpan = document.createElement('span');
        countSpan.textContent = selectedItem ? selectedItem.portionCount : '0';
        
        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.addEventListener('click', () => {
          handlePortionCounterClick({
            recipeId,
            menuRowName: menuItem.menuRowName,
            name: recipeName,
            nutrition,
            portionSize
          }, true);
          // Update the counter display after the portion count has been updated
          const updatedItem = selectedItems.find(item => 
            item.recipeId === recipeId && 
            item.menuRowName === menuItem.menuRowName
          );
          countSpan.textContent = updatedItem ? updatedItem.portionCount : '1';
        });
        
        portionCounter.appendChild(decreaseBtn);
        portionCounter.appendChild(countSpan);
        portionCounter.appendChild(increaseBtn);
        
        itemContainer.appendChild(nameSection);
        itemContainer.appendChild(portionCounter);
        li.appendChild(itemContainer);
      } else {
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
  dateDisplay.textContent = formatDate(dateKey);

  // Update the menu content
  const dayData = menuData[dateKey];
  if (!dayData) {
    ['breakfast-content', 'lunch-content', 'dinner-content'].forEach(meal => {
      document.getElementById(meal).textContent = 'No data available for this date.';
    });
    return;
  }

  // Find De Neve data in the menu - there are separate entries for each meal type
  const deneveBreakfast = dayData.find(venue => 
    venue && venue.menuName && venue.menuName === "De Neve Breakfast Service"
  );
  
  const deneveLunch = dayData.find(venue => 
    venue && venue.menuName && venue.menuName === "De Neve Lunch Service"
  );
  
  const deneveDinner = dayData.find(venue => 
    venue && venue.menuName && venue.menuName === "De Neve Dinner Service"
  );

  // Process menu data for each meal
  const processedData = {
    Breakfast: {},
    Lunch: {},
    Dinner: {}
  };

  // Process breakfast menu
  if (deneveBreakfast && deneveBreakfast.menuWeeks && Array.isArray(deneveBreakfast.menuWeeks)) {
    deneveBreakfast.menuWeeks.forEach(week => {
      if (!week || !week.menuDays || !Array.isArray(week.menuDays)) return;
      
      week.menuDays.forEach(day => {
        if (!day || !day.menuDayMealOptions || !Array.isArray(day.menuDayMealOptions)) return;
        
        day.menuDayMealOptions.forEach(mealOption => {
          if (!mealOption || !mealOption.menuRows || !Array.isArray(mealOption.menuRows)) return;
          
          // Use mealOptionName as the category
          const categoryName = mealOption.mealOptionName || "Main Station";
          if (!processedData.Breakfast[categoryName]) {
            processedData.Breakfast[categoryName] = [];
          }
          
          // Add menu items to the category
          mealOption.menuRows.forEach(row => {
            if (!row) return;
            
            processedData.Breakfast[categoryName].push({
              menuRowName: row.menuRowName,
              recipeId: row.recipeId,
              menuRowPortionSize: row.menuRowPortionSize,
              menuRowPortionSizeUnit: row.menuRowPortionSizeUnit
            });
          });
        });
      });
    });
  } else {
    document.getElementById('breakfast-content').textContent = 'No breakfast data available for De Neve.';
  }

  // Process lunch menu
  if (deneveLunch && deneveLunch.menuWeeks && Array.isArray(deneveLunch.menuWeeks)) {
    deneveLunch.menuWeeks.forEach(week => {
      if (!week || !week.menuDays || !Array.isArray(week.menuDays)) return;
      
      week.menuDays.forEach(day => {
        if (!day || !day.menuDayMealOptions || !Array.isArray(day.menuDayMealOptions)) return;
        
        day.menuDayMealOptions.forEach(mealOption => {
          if (!mealOption || !mealOption.menuRows || !Array.isArray(mealOption.menuRows)) return;
          
          // Use mealOptionName as the category
          const categoryName = mealOption.mealOptionName || "Main Station";
          if (!processedData.Lunch[categoryName]) {
            processedData.Lunch[categoryName] = [];
          }
          
          // Add menu items to the category
          mealOption.menuRows.forEach(row => {
            if (!row) return;
            
            processedData.Lunch[categoryName].push({
              menuRowName: row.menuRowName,
              recipeId: row.recipeId,
              menuRowPortionSize: row.menuRowPortionSize,
              menuRowPortionSizeUnit: row.menuRowPortionSizeUnit
            });
          });
        });
      });
    });
  } else {
    document.getElementById('lunch-content').textContent = 'No lunch data available for De Neve.';
  }

  // Process dinner menu
  if (deneveDinner && deneveDinner.menuWeeks && Array.isArray(deneveDinner.menuWeeks)) {
    deneveDinner.menuWeeks.forEach(week => {
      if (!week || !week.menuDays || !Array.isArray(week.menuDays)) return;
      
      week.menuDays.forEach(day => {
        if (!day || !day.menuDayMealOptions || !Array.isArray(day.menuDayMealOptions)) return;
        
        day.menuDayMealOptions.forEach(mealOption => {
          if (!mealOption || !mealOption.menuRows || !Array.isArray(mealOption.menuRows)) return;
          
          // Use mealOptionName as the category
          const categoryName = mealOption.mealOptionName || "Main Station";
          if (!processedData.Dinner[categoryName]) {
            processedData.Dinner[categoryName] = [];
          }
          
          // Add menu items to the category
          mealOption.menuRows.forEach(row => {
            if (!row) return;
            
            processedData.Dinner[categoryName].push({
              menuRowName: row.menuRowName,
              recipeId: row.recipeId,
              menuRowPortionSize: row.menuRowPortionSize,
              menuRowPortionSizeUnit: row.menuRowPortionSizeUnit
            });
          });
        });
      });
    });
  } else {
    document.getElementById('dinner-content').textContent = 'No dinner data available for De Neve.';
  }

  // Render each meal section
  renderMealSections(processedData.Breakfast, 'breakfast-content');
  renderMealSections(processedData.Lunch, 'lunch-content');
  renderMealSections(processedData.Dinner, 'dinner-content');
}

async function loadMenuData() {
  try {
    // Fetch the menu data
    const menuResponse = await fetch('../data/menu_data.json');
    menuData = await menuResponse.json();
    
    // Fetch the recipes data
    const recipesResponse = await fetch('../data/recipes.json');
    recipesData = await recipesResponse.json();
    
    // Fetch the ingredients data
    const ingredientsResponse = await fetch('../data/ingredients.json');
    ingredientsData = await ingredientsResponse.json();

    // Get all available dates and sort them
    const dates = Object.keys(menuData).sort();
    
    // Populate the date selector
    populateDateSelector(dates);

    // Get today's date
    const todayKey = getTodayDateKey();
    
    // If today's menu is available, use it
    // Otherwise, find the closest available date
    const initialDate = menuData[todayKey] ? todayKey : findClosestDate(dates, todayKey);
    
    // Set the selected date in the dropdown
    const datePicker = document.getElementById('date-picker');
    datePicker.value = initialDate;
    
    // Display the menu for the initial date
    updateMenuDisplay(initialDate);

  } catch (err) {
    console.error('Error fetching data:', err);
    document.getElementById('selected-date').textContent = 'Error loading menu data';
  }
}

function updateCalorieCounterSummary() {
  const summaryTable = document.getElementById('selected-items-body');
  const totalCalories = document.getElementById('total-calories');
  const totalProtein = document.getElementById('total-protein');
  const totalCarbs = document.getElementById('total-carbs');
  const totalFat = document.getElementById('total-fat');
  
  // Clear the table
  summaryTable.innerHTML = '';
  
  // Reset totals
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  
  // Add each selected item to the table
  selectedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    
    // Calculate nutritional values based on portion count
    const itemCalories = Math.round(item.nutrition.calories * item.portionCount);
    const itemProtein = Math.round(item.nutrition.protein * item.portionCount);
    const itemCarbs = Math.round(item.nutrition.carbs * item.portionCount);
    const itemFat = Math.round(item.nutrition.fat * item.portionCount);
    
    // Update totals
    calories += itemCalories;
    protein += itemProtein;
    carbs += itemCarbs;
    fat += itemFat;
    
    // Create row content
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.portionCount} x ${item.portionSize.size}${item.portionSize.unit}</td>
      <td>${itemCalories}</td>
      <td>${itemProtein}g</td>
      <td>${itemCarbs}g</td>
      <td>${itemFat}g</td>
      <td>
        <button class="remove-item" data-index="${index}">Remove</button>
      </td>
    `;
    
    summaryTable.appendChild(row);
  });
  
  // Update totals
  totalCalories.textContent = calories;
  totalProtein.textContent = `${protein}g`;
  totalCarbs.textContent = `${carbs}g`;
  totalFat.textContent = `${fat}g`;
  
  // Show/hide the summary based on whether there are selected items
  const summaryContainer = document.getElementById('calorie-counter-summary');
  if (selectedItems.length > 0) {
    summaryContainer.classList.add('show');
  } else {
    summaryContainer.classList.remove('show');
  }
}

function getCurrentMeal() {
  const now = new Date();
  // Convert to California time (Pacific Time)
  const californiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const hour = californiaTime.getHours();
  
  if (hour >= 5 && hour < 11) {
    return 'breakfast';
  } else if (hour >= 11 && hour < 16) {
    return 'lunch';
  } else {
    return 'dinner';
  }
}

function toggleMeal(mealType) {
  // Hide all meal sections
  document.querySelectorAll('.meal-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected meal section
  document.getElementById(mealType).classList.add('active');
  
  // Update toggle buttons
  document.querySelectorAll('.meal-toggle').forEach(toggle => {
    toggle.classList.remove('active');
    if (toggle.dataset.meal === mealType) {
      toggle.classList.add('active');
    }
  });
}

function toggleCalorieCounter() {
  isCalorieCounterEnabled = !isCalorieCounterEnabled;
  const toggleButton = document.getElementById('calorie-counter-toggle');
  const mealToggles = document.getElementById('meal-toggles');
  const dateSelector = document.querySelector('.date-selector-container');
  const currentMeal = document.querySelector('.meal-toggle.active').dataset.meal;
  
  if (isCalorieCounterEnabled) {
    toggleButton.textContent = 'Disable Calorie Counter';
    toggleButton.classList.add('active');
    document.getElementById('calorie-counter-summary').classList.add('show');
    mealToggles.style.display = 'none';
    dateSelector.style.display = 'none';
    
    // Hide all meals first
    document.querySelectorAll('.meal-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Show only the current meal
    document.getElementById(currentMeal).classList.add('active');
  } else {
    toggleButton.textContent = 'Enable Calorie Counter';
    toggleButton.classList.remove('active');
    document.getElementById('calorie-counter-summary').classList.remove('show');
    mealToggles.style.display = 'flex';
    dateSelector.style.display = 'flex';
    
    // Keep showing the current meal
    document.querySelectorAll('.meal-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(currentMeal).classList.add('active');
  }
  
  // Re-render the menu to update the display
  const datePicker = document.getElementById('date-picker');
  updateMenuDisplay(datePicker.value);
}

function handlePortionCounterClick(item, isIncrease) {
  const index = selectedItems.findIndex(i => 
    i.recipeId === item.recipeId && 
    i.menuRowName === item.menuRowName
  );
  
  if (index === -1 && isIncrease) {
    // Add new item
    selectedItems.push({
      ...item,
      portionCount: 1
    });
  } else if (index !== -1) {
    if (isIncrease) {
      // Increase portion count
      selectedItems[index].portionCount++;
    } else {
      // Decrease portion count or remove if 0
      selectedItems[index].portionCount--;
      if (selectedItems[index].portionCount <= 0) {
        selectedItems.splice(index, 1);
      }
    }
  }
  
  updateCalorieCounterSummary();
}

function removeItemFromSummary(index) {
  selectedItems.splice(index, 1);
  updateCalorieCounterSummary();
  
  // Re-render the menu to update all counters
  const datePicker = document.getElementById('date-picker');
  updateMenuDisplay(datePicker.value);
}

function initialize() {
  // Load initial menu data
  loadMenuData();

  // Add event listener for date changes
  document.getElementById('date-picker').addEventListener('change', (e) => {
    updateMenuDisplay(e.target.value);
  });
  
  // Add event listener for calorie counter toggle
  document.getElementById('calorie-counter-toggle').addEventListener('click', toggleCalorieCounter);
  
  // Add event listener for clear selections button
  document.getElementById('clear-selections').addEventListener('click', () => {
    selectedItems = [];
    updateCalorieCounterSummary();
    const datePicker = document.getElementById('date-picker');
    updateMenuDisplay(datePicker.value);
  });
  
  // Add event listener for remove item buttons
  document.getElementById('selected-items-body').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      removeItemFromSummary(index);
    }
  });

  // Add event listeners for meal toggles
  document.querySelectorAll('.meal-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggleMeal(toggle.dataset.meal);
    });
  });

  // Set initial meal based on time
  const initialMeal = getCurrentMeal();
  toggleMeal(initialMeal);
}

document.addEventListener('DOMContentLoaded', initialize);
  