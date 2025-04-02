// scripts/bplate-today.js

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
        li.textContent = formatRecipe(recipe);
        ul.appendChild(li);
      });
  
      sectionEl.appendChild(ul);
      container.appendChild(sectionEl);
    });
  }
  
  async function loadTodayMenu() {
    const todayKey = getTodayDateKey();
    console.log(todayKey)
    try {
      // Fetch the JSON for Bruin Plate
      const response = await fetch('data/1919_menu.json');
      const data = await response.json();
  
      if (!data[todayKey]) {
        console.warn(`No menu data for date = ${todayKey}`);
        document.getElementById('lunch').textContent = 'No data.';
        document.getElementById('dinner').textContent = 'No data.';
        return;
      }
  
      // Grab each meal section
      const lunchData = data[todayKey].Lunch;
      const dinnerData = data[todayKey].Dinner;
  
      // Render each meal into its respective column
      renderMealSections(lunchData, 'lunch');
      renderMealSections(dinnerData, 'dinner');
    } catch (err) {
      console.error('Error fetching Bruin Plate data:', err);
    }
  }
  
  document.addEventListener('DOMContentLoaded', loadTodayMenu);
  