import { tagIcons } from './constants.js'

function getTodayDateKey() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // e.g. "2025-03-31"
  }
  
  /**
   * Format one recipe: "Name (XXX Cal)"
   */
  function formatRecipe(recipe) {
    let text = recipe.name;
    if (recipe.calories) {
      text += ` (${recipe.calories} Cal)`;
    }
    return text;
  }
  
  /**
   * Render the given meal data, preserving each section/station as a subheading.
   * mealData = { "Station Name": [ { name, calories, ...}, ...], ... }
   */
  function renderMealSections(mealData, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear existing content
  
    if (!mealData) {
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
      mealData[sectionName].forEach(recipe => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = `${recipe.name} (${recipe.calories} Cal)`;
  
        // Create a tag icon group
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag-icons';
        if (recipe.tags) {
          recipe.tags.forEach(tag => {
            const iconPath = tagIcons[tag];
            if (iconPath) {
              const iconImg = document.createElement('img');
              iconImg.src = iconPath;
              iconImg.alt = tag;
              iconImg.title = tag;
              iconImg.className = 'tag-icon-img';
              tagSpan.appendChild(iconImg);
            }
          });
        }
  
        li.appendChild(name);
        li.appendChild(tagSpan);
        ul.appendChild(li);
      });
  
      sectionEl.appendChild(ul);
      container.appendChild(sectionEl);
    });
  }
  
  async function loadTodayMenu() {
    const todayKey = getTodayDateKey();
    try {
      // Fetch the JSON for Bruin Plate
      const response = await fetch('data/deneve_menu.json');
      const data = await response.json();
  
      if (!data[todayKey]) {
        console.warn(`No menu data for date = ${todayKey}`);
        document.getElementById('breakfast').textContent = 'No data.';
        document.getElementById('lunch').textContent = 'No data.';
        document.getElementById('dinner').textContent = 'No data.';
        return;
      }
  
      // Grab each meal section
      const breakfastData = data[todayKey].Breakfast;
      const lunchData = data[todayKey].Lunch;
      const dinnerData = data[todayKey].Dinner;
  
      // Render each meal into its respective column
      renderMealSections(breakfastData, 'breakfast');
      renderMealSections(lunchData, 'lunch');
      renderMealSections(dinnerData, 'dinner');
    } catch (err) {
      console.error('Error fetching Bruin Plate data:', err);
    }
  }
  
  document.addEventListener('DOMContentLoaded', loadTodayMenu);
  