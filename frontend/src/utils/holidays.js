// Holidays data for 2025
// Fixed Holidays
export const fixedHolidays = [
  { id: 1, name: "New Year's Day", date: "01.01.2025", month: "January", day: "Wednesday" },
  { id: 2, name: "New Year Celebration", date: "02.01.2025", month: "January", day: "Thursday" },
  { id: 3, name: "State Day", date: "20.02.2025", month: "February", day: "Thursday" },
  { id: 4, name: "Good Friday", date: "18.04.2025", month: "April", day: "Friday" },
  { id: 5, name: "Remna Ni", date: "30.06.2025", month: "June", day: "Monday" },
  { id: 6, name: "Independence Day", date: "15.08.2025", month: "August", day: "Friday" },
  { id: 7, name: "Mahatma Gandhi's Birthday", date: "02.10.2025", month: "October", day: "Thursday" },
  { id: 8, name: "Christmas Eve", date: "24.12.2025", month: "December", day: "Wednesday" },
  { id: 9, name: "Christmas Day", date: "25.12.2025", month: "December", day: "Thursday" },
  { id: 10, name: "Christmas Celebration", date: "26.12.2025", month: "December", day: "Friday" }
]

// Optional Holidays
export const optionalHolidays = [
  { id: 1, name: "New Year Celebration", date: "03.01.2025", month: "January", day: "Friday" },
  { id: 2, name: "Guru Ravi Das' Birthday", date: "12.02.2025", month: "February", day: "Wednesday" },
  { id: 3, name: "Chapchar Kut", date: "07.03.2025", month: "March", day: "Friday" },
  { id: 4, name: "Holi", date: "14.03.2025", month: "March", day: "Friday" },
  { id: 5, name: "Id-ul Fitr", date: "31.03.2025", month: "March", day: "Monday" },
  { id: 6, name: "Mahavir Jayanti", date: "10.04.2025", month: "April", day: "Thursday" },
  { id: 7, name: "Meshadi (Tamil New Year's)", date: "14.04.2025", month: "April", day: "Monday" },
  { id: 8, name: "Vaisakhadi (Bengali) Bahag Bihu (Assam)", date: "15.04.2025", month: "April", day: "Tuesday" },
  { id: 9, name: "Easter Monday", date: "21.04.2025", month: "April", day: "Monday" },
  { id: 10, name: "Guru Rabindranath's Birthday", date: "09.05.2025", month: "May", day: "Friday" },
  { id: 11, name: "Buddha Purnima", date: "12.05.2025", month: "May", day: "Monday" },
  { id: 12, name: "Rath Yatra", date: "27.06.2025", month: "June", day: "Friday" },
  { id: 13, name: "Ganesh Chaturthi/ Vinayaka Chaturthi", date: "27.08.2025", month: "August", day: "Wednesday" },
  { id: 14, name: "Milad-un-Nabi or Id-e-Milad (Birthday of Prophet Mohamed)", date: "05.09.2025", month: "September", day: "Friday" },
  { id: 15, name: "Dussehra (Saptami)", date: "29.09.2025", month: "September", day: "Monday" },
  { id: 16, name: "Dussehra (Mahashtami)", date: "30.09.2025", month: "September", day: "Tuesday" },
  { id: 17, name: "Dussehra (Mahanavmi)", date: "01.10.2025", month: "October", day: "Wednesday" },
  { id: 18, name: "Maharishi Valmiki's Birthday", date: "07.10.2025", month: "October", day: "Tuesday" },
  { id: 19, name: "Diwali (Deepavalli)", date: "20.10.2025", month: "October", day: "Monday" },
  { id: 20, name: "Bhai Duj", date: "23.10.2025", month: "October", day: "Thursday" },
  { id: 21, name: "Guru Nanak's Birthday", date: "05.11.2025", month: "November", day: "Wednesday" },
  { id: 22, name: "Guru Teg Bahadur's Martyrdom Day", date: "24.11.2025", month: "November", day: "Monday" },
  { id: 23, name: "New Year's Eve", date: "31.12.2025", month: "December", day: "Wednesday" }
]

// Combine all holidays (fixed + optional)
export const allHolidays = [...fixedHolidays, ...optionalHolidays]

/**
 * Parse holiday date from DD.MM.YYYY format to Date object
 * @param {string} dateStr - Date string in DD.MM.YYYY format
 * @returns {Date} Date object
 */
export const parseHolidayDate = (dateStr) => {
  const [day, month, year] = dateStr.split('.')
  // month is 0-indexed in Date constructor
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

/**
 * Convert date to YYYY-MM-DD format for comparison
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateForComparison = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if a given date is a holiday
 * @param {Date|string|null} date - Date object or YYYY-MM-DD string or null
 * @param {boolean} includeOptional - Whether to include optional holidays (default: true)
 * @returns {Object|null} Holiday object if found, null otherwise
 */
export const isHoliday = (date, includeOptional = true) => {
  // Handle null or undefined dates
  if (!date || date === null) {
    return null
  }
  
  let dateObj
  let dateStr
  
  if (typeof date === 'string') {
    // Handle empty strings
    if (!date || date.trim() === '') {
      return null
    }
    // Assume YYYY-MM-DD format
    dateStr = date
    const [year, month, day] = date.split('-')
    dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  } else {
    dateObj = date
    dateStr = formatDateForComparison(date)
    // If formatDateForComparison returns null, the date is invalid
    if (!dateStr) {
      return null
    }
  }
  
  const holidaysToCheck = includeOptional ? allHolidays : fixedHolidays
  
  for (const holiday of holidaysToCheck) {
    const holidayDate = parseHolidayDate(holiday.date)
    const holidayDateStr = formatDateForComparison(holidayDate)
    
    // Skip if holiday date is invalid
    if (!holidayDateStr) {
      continue
    }
    
    if (holidayDateStr === dateStr) {
      return holiday
    }
  }
  
  return null
}

/**
 * Get all holidays for a specific year
 * @param {number} year - Year (e.g., 2025)
 * @param {boolean} includeOptional - Whether to include optional holidays (default: true)
 * @returns {Array} Array of holiday objects
 */
export const getHolidaysForYear = (year, includeOptional = true) => {
  const holidaysToCheck = includeOptional ? allHolidays : fixedHolidays
  return holidaysToCheck.filter(holiday => {
    const holidayDate = parseHolidayDate(holiday.date)
    return holidayDate.getFullYear() === year
  })
}

/**
 * Get all holidays for a specific month
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (0-11, where 0 is January)
 * @param {boolean} includeOptional - Whether to include optional holidays (default: true)
 * @returns {Array} Array of holiday objects
 */
export const getHolidaysForMonth = (year, month, includeOptional = true) => {
  const holidaysToCheck = includeOptional ? allHolidays : fixedHolidays
  return holidaysToCheck.filter(holiday => {
    const holidayDate = parseHolidayDate(holiday.date)
    return holidayDate.getFullYear() === year && holidayDate.getMonth() === month
  })
}

/**
 * Check if a given date is a fixed holiday
 * @param {Date|string|null} date - Date object or YYYY-MM-DD string or null
 * @returns {Object|null} Fixed holiday object if found, null otherwise
 */
export const isFixedHoliday = (date) => {
  // Handle null or undefined dates
  if (!date || date === null) {
    return null
  }
  
  let dateStr
  
  if (typeof date === 'string') {
    // Handle empty strings
    if (!date || date.trim() === '') {
      return null
    }
    // Assume YYYY-MM-DD format
    dateStr = date
  } else {
    dateStr = formatDateForComparison(date)
    // If formatDateForComparison returns null, the date is invalid
    if (!dateStr) {
      return null
    }
  }
  
  for (const holiday of fixedHolidays) {
    const holidayDate = parseHolidayDate(holiday.date)
    const holidayDateStr = formatDateForComparison(holidayDate)
    
    // Skip if holiday date is invalid
    if (!holidayDateStr) {
      continue
    }
    
    if (holidayDateStr === dateStr) {
      return holiday
    }
  }
  
  return null
}

