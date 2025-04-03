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
  if (!dayData) {
    console.warn(`No menu data for date = ${dateKey}`);
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      document.getElementById(meal).textContent = 'No data available for this date.';
    });
    return;
  }

  // Render each meal section
  renderMealSections(dayData.Breakfast, 'breakfast');
  renderMealSections(dayData.Lunch, 'lunch');
  renderMealSections(dayData.Dinner, 'dinner');
}

async function loadMenuData() {
  try {
    // Fetch the JSON for De Neve
    const response = await fetch('data/deneve_menu.json');
    menuData = await response.json();

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
    console.error('Error fetching De Neve data:', err);
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
  