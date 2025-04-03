import { tagIcons } from './constants.js'

let menuData = null;

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

async function loadMenuData() {
  try {
    // Fetch the JSON for Epicuria at Ackerman
    const response = await fetch('data/epic_at_ackerman_menu.json');
    menuData = await response.json();

    // Get today's date
    const todayKey = getTodayDateKey();
    console.log('Looking for today\'s menu:', todayKey);
    
    // Update the menu content
    const dayData = menuData[todayKey];
    if (!dayData) {
      ['lunch'].forEach(meal => {
        document.getElementById(meal).textContent = 'No menu data available for today.';
      });
      return;
    }

    // Render today's menu
    renderMealSections(dayData.Lunch, 'lunch');

  } catch (err) {
    console.error('Error fetching Epicuria at Ackerman data:', err);
    document.getElementById('lunch').textContent = 'Error loading menu data';
  }
}

document.addEventListener('DOMContentLoaded', loadMenuData);
  