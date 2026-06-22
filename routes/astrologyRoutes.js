const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');


// ✅ Correct API Base URL
const API_BASE = 'https://json.astrologyapi.com/v1';
const ACCESS_TOKEN = process.env.ASTRO_ACCESS_TOKEN;

console.log('=================================');
console.log('🔥 AstrologyAPI Configuration');
console.log('Access Token:', ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
console.log('Base URL :', API_BASE);
console.log('=================================');

const getHeaders = () => {
  if (!ACCESS_TOKEN) return null;
  return {
    'x-astrologyapi-key': ACCESS_TOKEN,
    'Content-Type': 'application/json'
  };
};

// Helper function to get zodiac from degree
const getZodiacFromDegree = (degree) => {
  if (!degree && degree !== 0) return 'N/A';
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs[Math.floor(degree / 30) % 12];
};

// Helper function to get lord from sign
const getLordFromSign = (sign) => {
  const lordMap = {
    'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
    'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
    'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
    'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
  };
  return lordMap[sign] || 'N/A';
};

// Calculate houses from ascendant
const getHousesFromAscendant = (ascendant) => {
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  let startIndex = zodiacSigns.findIndex(s => s.toLowerCase() === ascendant.toLowerCase());
  if (startIndex === -1) startIndex = 0;
  
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const signIndex = (startIndex + i) % 12;
    houses.push({
      number: i + 1,
      sign: zodiacSigns[signIndex],
      degree: `${i * 30}° - ${(i + 1) * 30}°`,
      lord: getLordFromSign(zodiacSigns[signIndex])
    });
  }
  return houses;
};

// Calculate planets positions based on date (approximate for demo)
const getPlanetsFromDate = (year, month, date) => {
  const planets = {};
  const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  // Calculate approximate day of year
  const dayOfYear = Math.floor((new Date(year, month - 1, date) - new Date(year, 0, 0)) / 86400000);
  
  // Approximate planet longitudes
  const longitudes = {
    sun: (dayOfYear * 0.9856) % 360,
    moon: (dayOfYear * 13.176) % 360,
    mars: ((dayOfYear * 0.524) % 360) + 120,
    mercury: ((dayOfYear * 1.234) % 360) + 80,
    jupiter: ((dayOfYear * 0.083) % 360) + 240,
    venus: ((dayOfYear * 1.602) % 360) + 45,
    saturn: ((dayOfYear * 0.033) % 360) + 180,
    rahu: ((dayOfYear * 0.052) % 360) + 300,
    ketu: ((dayOfYear * 0.052) % 360) + 120
  };
  
  for (const planet of planetList) {
    const longitude = longitudes[planet];
    const signIndex = Math.floor(longitude / 30) % 12;
    planets[planet] = {
      name: planetNames[planet],
      sign: zodiacSigns[signIndex],
      degree: Math.floor(longitude),
      house: signIndex + 1,
      retrograde: planet === 'saturn' || planet === 'rahu' || planet === 'ketu'
    };
  }
  
  return planets;
};

// Calculate Dasha based on Moon's nakshatra
const getDashaFromNakshatra = (nakshatra) => {
  const nakshatraDashaMap = {
    'Ashwini': 'Ketu', 'Bharani': 'Venus', 'Krittika': 'Sun',
    'Rohini': 'Moon', 'Mrigashira': 'Mars', 'Ardra': 'Rahu',
    'Punarvasu': 'Jupiter', 'Pushya': 'Saturn', 'Ashlesha': 'Mercury',
    'Magha': 'Ketu', 'Purva Phalguni': 'Venus', 'Uttara Phalguni': 'Sun',
    'Hasta': 'Moon', 'Chitra': 'Mars', 'Swati': 'Rahu',
    'Vishakha': 'Jupiter', 'Anuradha': 'Saturn', 'Jyeshtha': 'Mercury',
    'Mula': 'Ketu', 'Purva Ashadha': 'Venus', 'Uttara Ashadha': 'Sun',
    'Shravana': 'Moon', 'Dhanishtha': 'Mars', 'Shatabhisha': 'Rahu',
    'Purva Bhadrapada': 'Jupiter', 'Uttara Bhadrapada': 'Saturn', 'Revati': 'Mercury'
  };
  
  const dashaOrder = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const dashaYears = [7, 20, 6, 10, 7, 18, 16, 19, 17];
  
  const mahaDasha = nakshatraDashaMap[nakshatra] || 'Venus';
  const currentIndex = dashaOrder.indexOf(mahaDasha);
  const antarDasha = dashaOrder[(currentIndex + 1) % 9] || 'Sun';
  
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + dashaYears[currentIndex]);
  
  return {
    maha_dasha: mahaDasha,
    antar_dasha: antarDasha,
    end_date: endDate.toISOString().split('T')[0]
  };
};

// ================== GENERATE KUNDLI & PANCHANG ==================
router.post('/generate', protect, async (req, res) => {
  try {
    const { date, month, year, hour, minute, latitude, longitude, timezone = 5.5 } = req.body;

    console.log('📥 Received:', { date, month, year, hour, minute, latitude, longitude });

    // Validation
    if (!date || !month || !year || hour === undefined || minute === undefined || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const requestBody = {
      day: parseInt(date),
      month: parseInt(month),
      year: parseInt(year),
      hour: parseInt(hour),
      min: parseInt(minute),
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      tzone: parseFloat(timezone),
      ayanamsha: 'lahiri'
    };

    console.log('📤 Request to AstrologyAPI:', JSON.stringify(requestBody, null, 2));

    const headers = getHeaders();

    if (!headers) {
      return res.status(401).json({
        success: false,
        message: 'Astrology API Access Token missing in .env file'
      });
    }

    // ✅ Call both APIs
    const [kundliResponse, panchangResponse] = await Promise.all([
      axios.post(`${API_BASE}/astro_details`, requestBody, {
        headers: headers,
        timeout: 30000
      }),
      axios.post(`${API_BASE}/basic_panchang`, requestBody, {
        headers: headers,
        timeout: 30000
      })
    ]);

    console.log('✅ Both APIs responded successfully');
    
    const kundliRaw = kundliResponse.data;
    const panchangRaw = panchangResponse.data;
    
    console.log('📊 Kundli Response:', JSON.stringify(kundliRaw, null, 2));

    // ✅ Extract data from response
    const ascendant = kundliRaw.ascendant || 'N/A';
    const ascendantLord = kundliRaw.ascendant_lord || getLordFromSign(ascendant);
    const sign = kundliRaw.sign || 'N/A';
    const nakshatra = kundliRaw.Naksahtra || kundliRaw.nakshatra || 'N/A';
    const nakshatraLord = kundliRaw.NaksahtraLord || 'N/A';
    const nakshatraPada = kundliRaw.Charan || 'N/A';
    
    // ✅ Generate houses from ascendant
    const houses = getHousesFromAscendant(ascendant);
    
    // ✅ Generate planets from date
    const planets = getPlanetsFromDate(year, month, date);
    
    // ✅ Calculate Dasha from nakshatra
    const dasha = getDashaFromNakshatra(nakshatra);
    
    // ✅ Vedic details from response
    const yoga = kundliRaw.Yog || 'N/A';
    const tithi = kundliRaw.Tithi || 'N/A';
    const karana = kundliRaw.Karan || 'N/A';
    const gan = kundliRaw.Gan || 'N/A';
    const nadi = kundliRaw.Nadi || 'N/A';
    const varna = kundliRaw.Varna || 'N/A';
    const vashya = kundliRaw.Vashya || 'N/A';
    const yoni = kundliRaw.Yoni || 'N/A';
    const signLord = kundliRaw.SignLord || getLordFromSign(sign);
    const tatva = kundliRaw.tatva || 'N/A';
    const paya = kundliRaw.paya || 'N/A';
    const nameAlphabet = kundliRaw.name_alphabet || 'N/A';
    const manglik = 'No'; // Calculate based on Mars position if needed
    
    // ✅ Panchang data
    const sunrise = panchangRaw.sunrise || 'N/A';
    const sunset = panchangRaw.sunset || 'N/A';
    const moonrise = panchangRaw.moonrise || 'N/A';
    const panchangTithi = panchangRaw.tithi || 'N/A';
    const panchangNakshatra = panchangRaw.nakshatra || 'N/A';
    const panchangYoga = panchangRaw.yog || 'N/A';
    const panchangKarana = panchangRaw.karan || 'N/A';
    
    // ✅ Merge final response
    const mergedKundli = {
      ascendant_sign: ascendant,
      ascendant_lord: ascendantLord,
      sign: sign,
      rashi: sign,
      sign_lord: signLord,
      nakshatra: nakshatra,
      nakshatra_lord: nakshatraLord,
      nakshatra_pada: nakshatraPada,
      manglik: manglik,
      yoga: yoga,
      tithi: tithi,
      karana: karana,
      gan: gan,
      nadi: nadi,
      varna: varna,
      vashya: vashya,
      yoni: yoni,
      tatva: tatva,
      paya: paya,
      name_alphabet: nameAlphabet,
      planets: planets,
      houses: houses,
      dasha: dasha
    };
    
    const mergedPanchang = {
      sunrise: sunrise,
      sunset: sunset,
      moonrise: moonrise,
      tithi: panchangTithi,
      nakshatra: panchangNakshatra,
      yog: panchangYoga,
      karan: panchangKarana,
      paksha: panchangTithi?.split('-')[0] || 'N/A',
      ritu: 'N/A',
      ayana: 'N/A'
    };

    console.log('✅ Final Kundli - Houses:', mergedKundli.houses.length);
    console.log('✅ Final Kundli - Dasha:', mergedKundli.dasha);
    console.log('✅ Final Kundli - Planets:', Object.keys(mergedKundli.planets).length);

    return res.json({
      success: true,
      kundli: mergedKundli,
      panchang: mergedPanchang
    });

  } catch (apiError) {
    console.error("=== ASTROLOGY API ERROR ===");
    console.error("Status:", apiError.response?.status);
    console.error("Response:", JSON.stringify(apiError.response?.data, null, 2));
    console.error("Message:", apiError.message);
    
    if (apiError.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Access Token. Please check your Access Token.'
      });
    }

    return res.status(502).json({
      success: false,
      message: apiError.response?.data?.message || 'Failed to connect to Astrology API',
      details: apiError.response?.data
    });
  }
});

// ✅ Ek baar chalao, phir hata dena - Sirf old charts ko fix karne ke liye
router.post('/fix-old-charts', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let fixed = 0;
    
    for (let i = 0; i < user.savedCharts.length; i++) {
      if (!user.savedCharts[i].isPaid) {
        user.savedCharts[i].isPaid = true;
        fixed++;
      }
    }
    
    await user.save();
    res.json({ success: true, message: `Fixed ${fixed} charts`, total: user.savedCharts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== DOWNLOAD PDF - VERCEL COMPATIBLE (MULTI-PAGE) ==================
// ================== DOWNLOAD PDF - FINAL WORKING ==================
router.post('/download-pdf', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
    console.log('📥 Generating PDF for user:', req.user?._id || 'Unknown');

    // ========== SANITIZER - Removes ALL special characters ==========
    const cleanText = (text) => {
      if (text === null || text === undefined) return 'N/A';
      // Remove emojis, special symbols, and non-ASCII characters
      return String(text)
        .replace(/[^\x00-\x7F]/g, '') // Remove all non-ASCII characters
        .replace(/[^a-zA-Z0-9\s\/\:\.\-\(\)]/g, '') // Only allow safe chars
        .trim() || 'N/A';
    };

    const getValue = (obj, key, defaultValue = 'N/A') => {
      if (!obj) return defaultValue;
      if (Array.isArray(key)) {
        let current = obj;
        for (const k of key) {
          if (current && current[k] !== undefined && current[k] !== null && current[k] !== '') {
            current = current[k];
          } else return defaultValue;
        }
        return current;
      }
      const value = obj[key];
      return (value !== undefined && value !== null && value !== '') ? value : defaultValue;
    };

    // ========== GET ALL DATA ==========
    const userName = cleanText(userDetails?.name || req.user?.fullName || req.user?.name || 'User');
    const birth = userDetails?.birthDetails || {};

    const birthDate = birth.date && birth.month && birth.year 
      ? `${birth.date}/${birth.month}/${birth.year}` : 'N/A';
    const birthTime = birth.hour && birth.minute 
      ? `${birth.hour}:${birth.minute}` : 'N/A';
    // const birthPlace = cleanText(birth.place || birth.location || 'N/A');

    const kundli = kundliData || {};
    const panchang = panchangData || {};

    // Basic Details
    const ascendant = cleanText(getValue(kundli, 'ascendant_sign') || getValue(kundli, 'lagna') || 'N/A');
    const ascendantLord = cleanText(getValue(kundli, 'ascendant_lord') || getValue(kundli, 'lagna_lord') || 'N/A');
    const rashi = cleanText(getValue(kundli, 'rashi') || getValue(kundli, 'sign') || 'N/A');
    const signLord = cleanText(getValue(kundli, 'sign_lord') || 'N/A');
    const nakshatra = cleanText(getValue(kundli, 'nakshatra') || 'N/A');
    const nakshatraLord = cleanText(getValue(kundli, 'nakshatra_lord') || 'N/A');
    const nakshatraPada = cleanText(getValue(kundli, 'nakshatra_pada') || 'N/A');
    const manglik = cleanText(getValue(kundli, 'manglik') || 'No');

    // Vedic Details
    const yoga = cleanText(getValue(kundli, 'yoga') || 'N/A');
    const tithi = cleanText(getValue(kundli, 'tithi') || 'N/A');
    const karana = cleanText(getValue(kundli, 'karana') || 'N/A');
    const gan = cleanText(getValue(kundli, 'gan') || 'N/A');
    const nadi = cleanText(getValue(kundli, 'nadi') || 'N/A');
    const varna = cleanText(getValue(kundli, 'varna') || 'N/A');
    const vashya = cleanText(getValue(kundli, 'vashya') || 'N/A');
    const yoni = cleanText(getValue(kundli, 'yoni') || 'N/A');
    const tatva = cleanText(getValue(kundli, 'tatva') || 'N/A');
    const paya = cleanText(getValue(kundli, 'paya') || 'N/A');
    const nameAlphabet = cleanText(getValue(kundli, 'name_alphabet') || 'N/A');

    // Planets
    const planets = kundli.planets || {};
    const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
    const planetNames = { sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu' };
    const houses = kundli.houses || [];

    // Dasha
    const mahaDasha = cleanText(getValue(kundli, ['dasha', 'maha_dasha']) || 'N/A');
    const antarDasha = cleanText(getValue(kundli, ['dasha', 'antar_dasha']) || 'N/A');
    const dashaEndDate = cleanText(getValue(kundli, ['dasha', 'end_date']) || 'N/A');

    // Panchang
    const sunrise = cleanText(getValue(panchang, 'sunrise') || 'N/A');
    const sunset = cleanText(getValue(panchang, 'sunset') || 'N/A');
    const moonrise = cleanText(getValue(panchang, 'moonrise') || 'N/A');
    const panchangTithi = cleanText(getValue(panchang, 'tithi') || 'N/A');
    const panchangNakshatra = cleanText(getValue(panchang, 'nakshatra') || 'N/A');
    const panchangYoga = cleanText(getValue(panchang, 'yog') || getValue(panchang, 'yoga') || 'N/A');
    const panchangKarana = cleanText(getValue(panchang, 'karan') || getValue(panchang, 'karana') || 'N/A');
    const paksha = cleanText(getValue(panchang, 'paksha') || 'N/A');
    const rahuKaal = cleanText(getValue(panchang, 'rahukaal') || 'N/A');
    const yamaganda = cleanText(getValue(panchang, 'yamaganda') || 'N/A');
    const gulika = cleanText(getValue(panchang, 'gulika') || 'N/A');

    // ========== CREATE PDF ==========
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 45;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const colors = {
      darkRed: rgb(0.545, 0, 0),
      gold: rgb(0.831, 0.627, 0.09),
      black: rgb(0, 0, 0),
      gray: rgb(0.4, 0.4, 0.4),
      darkGray: rgb(0.2, 0.2, 0.2),
      white: rgb(1, 1, 1),
      lightRed: rgb(0.996, 0.949, 0.949),
      lightGold: rgb(0.996, 0.99, 0.91),
      lightGreen: rgb(0.94, 0.99, 0.94),
      lightBlue: rgb(0.94, 0.97, 0.99),
      lightPurple: rgb(0.97, 0.94, 0.99),
    };

    const addNewPage = () => {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
      currentPage.drawText('AstroPlanets - Kundli Report', {
        x: margin, y: pageHeight - 35, size: 12, font: fontBold, color: colors.darkRed
      });
    };

    const checkSpace = (spaceNeeded) => {
      if (y - spaceNeeded < 60) {
        addNewPage();
        return true;
      }
      return false;
    };

    // ========== COVER PAGE ==========
   // Cover Page Border
currentPage.drawRectangle({
  x: 30,
  y: 30,
  width: pageWidth - 60,
  height: pageHeight - 60,
  borderColor: colors.gold,
  borderWidth: 3,
});

currentPage.drawRectangle({
  x: 40,
  y: 40,
  width: pageWidth - 80,
  height: pageHeight - 80,
  borderColor: colors.gold,
  borderWidth: 1,
});

// Title
currentPage.drawText('ASTROPLANETS', {
  x: pageWidth / 2 - 135,
  y: pageHeight - 130,
  size: 36,
  font: fontBold,
  color: colors.darkRed,
});

currentPage.drawText('Vedic Astrology Birth Chart Report', {
  x: pageWidth / 2 - 105,
  y: pageHeight - 165,
  size: 14,
  font: font,
  color: colors.gold,
});

// User Name
currentPage.drawText(userName.toUpperCase(), {
  x: pageWidth / 2 - 110,
  y: pageHeight - 235,
  size: 26,
  font: fontBold,
  color: colors.darkRed,
});

// Birth Details Box
const detailBoxY = pageHeight - 470;

currentPage.drawRectangle({
  x: pageWidth / 2 - 165,
  y: detailBoxY,
  width: 330,
  height: 140,
  color: colors.lightRed,
  borderColor: colors.darkRed,
  borderWidth: 1.5,
});

// Heading
currentPage.drawText('BIRTH DETAILS', {
  x: pageWidth / 2 - 55,
  y: detailBoxY + 115,
  size: 13,
  font: fontBold,
  color: colors.darkRed,
});

// Details
currentPage.drawText(`Date : ${birthDate}`, {
  x: pageWidth / 2 - 130,
  y: detailBoxY + 85,
  size: 11,
  font: font,
  color: colors.darkGray,
});

currentPage.drawText(`Time : ${birthTime}`, {
  x: pageWidth / 2 - 130,
  y: detailBoxY + 60,
  size: 11,
  font: font,
  color: colors.darkGray,
});

currentPage.drawText(`Rashi : ${rashi}`, {
  x: pageWidth / 2 - 130,
  y: detailBoxY + 35,
  size: 11,
  font: font,
  color: colors.darkGray,
});

currentPage.drawText(`Nakshatra : ${nakshatra}`, {
  x: pageWidth / 2 - 130,
  y: detailBoxY + 10,
  size: 11,
  font: font,
  color: colors.darkGray,
});

// Footer
currentPage.drawText(
  `Generated: ${new Date().toLocaleDateString()}`,
  {
    x: pageWidth / 2 - 75,
    y: 55,
    size: 9,
    font: font,
    color: colors.gray,
  }
);
    // ========== CONTENT PAGE ==========
    addNewPage();

    currentPage.drawText('Kundli Report - ' + userName, { x: margin, y: y, size: 13, font: fontBold, color: colors.gold });
    y -= 40;
// 1. LAGNA
checkSpace(100);

const lagnaBoxHeight = 80;

currentPage.drawRectangle({
  x: margin,
  y: y - lagnaBoxHeight,
  width: pageWidth - 2 * margin,
  height: lagnaBoxHeight,
  color: colors.darkRed,
});

// Title
const lagnaTitle = 'LAGNA (ASCENDANT)';
const lagnaTitleWidth = fontBold.widthOfTextAtSize(lagnaTitle, 12);

currentPage.drawText(lagnaTitle, {
  x: (pageWidth - lagnaTitleWidth) / 2,
  y: y - 22,
  size: 12,
  font: fontBold,
  color: colors.white,
});

// Ascendant Name
const ascWidth = fontBold.widthOfTextAtSize(ascendant, 24);

currentPage.drawText(ascendant, {
  x: (pageWidth - ascWidth) / 2,
  y: y - 48,
  size: 24,
  font: fontBold,
  color: colors.gold,
});

// Ascendant Lord
const lordText = `Lord: ${ascendantLord}`;
const lordWidth = font.widthOfTextAtSize(lordText, 10);

currentPage.drawText(lordText, {
  x: (pageWidth - lordWidth) / 2,
  y: y - 65,
  size: 10,
  font: font,
  color: colors.white,
});

// Bottom spacing
y -= 100;

    // 2. RASHI AND NAKSHATRA
    checkSpace(110);
    currentPage.drawText('RASHI AND NAKSHATRA', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
    y -= 22;

    const rData = [
      ['Rashi', rashi],
      ['Sign Lord', signLord],
      ['Nakshatra', nakshatra],
      ['Nakshatra Lord', nakshatraLord],
      ['Pada', nakshatraPada]
    ];

    const rColW = (pageWidth - 2*margin - 20) / 2;
    let ry = y;
    rData.forEach(([label, val], i) => {
      const x = margin + (i % 2) * (rColW + 20);
      currentPage.drawRectangle({ x, y: ry - 22, width: rColW, height: 26, color: colors.lightBlue, borderColor: colors.gray, borderWidth: 0.5 });
      currentPage.drawText(label + ': ' + val, { x: x + 8, y: ry - 14, size: 9.5, font: font, color: colors.black });
      if (i % 2 === 1) ry -= 32;
    });
    y = ry - 15;

    // 3. MANGLIK
    checkSpace(55);
    y -=15;
    const isManglik = manglik.toLowerCase().includes('yes') || manglik.toLowerCase().includes('manglik');
    const mangColor = isManglik ? rgb(0.65, 0.05, 0.05) : rgb(0.1, 0.55, 0.1);
    currentPage.drawRectangle({ x: margin, y: y - 35, width: pageWidth - 2*margin, height: 40, color: mangColor });
    currentPage.drawText('MANGAL DOSHA: ' + (isManglik ? 'Manglik' : 'Non-Manglik'), { x: pageWidth/2 - 95, y: y - 20, size: 13, font: fontBold, color: colors.white });
    y -= 55;

    // 4. PLANETS
    checkSpace(200);
    currentPage.drawText('PLANETARY POSITIONS', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
    y -= 25;

    const planetColWidths = [60, 55, 45, 45, 55];
    const pHeaders = ['Planet', 'Sign', 'Degree', 'House', 'Retro'];
    currentPage.drawRectangle({ x: margin, y: y - 18, width: pageWidth - 2*margin, height: 22, color: colors.darkRed });
    let hx = margin + 6;
    pHeaders.forEach((h, i) => {
      currentPage.drawText(h, { x: hx, y: y - 12, size: 9, font: fontBold, color: colors.white });
      hx += planetColWidths[i];
    });
    y -= 24;

    planetList.forEach((p, i) => {
      checkSpace(28);
      const pd = planets[p] || {};
      const rowColor = i % 2 === 0 ? rgb(0.98, 0.975, 0.96) : colors.white;

      currentPage.drawRectangle({ x: margin, y: y - 18, width: pageWidth - 2*margin, height: 22, color: rowColor, borderColor: colors.gray, borderWidth: 0.4 });

      const rowData = [
        planetNames[p],
        cleanText(pd.sign || 'N/A'),
        cleanText(pd.degree || 'N/A') + '°',
        cleanText(pd.house || 'N/A'),
        pd.retrograde ? 'Yes' : 'No'
      ];

      let tx = margin + 6;
      rowData.forEach((text, j) => {
        currentPage.drawText(text, { x: tx, y: y - 12, size: 8.5, font: j === 0 ? fontBold : font, color: colors.black });
        tx += planetColWidths[j];
      });
      y -= 24;
    });
    y -= 8;

    // 5. HOUSES
    if (houses.length > 0) {
      checkSpace(140);
      currentPage.drawText('HOUSES (BHAVAS)', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
      y -= 25;

      const hColW = [55, 85, 85];
      const hHeaders = ['House', 'Sign', 'Lord'];
      currentPage.drawRectangle({ x: margin, y: y - 18, width: pageWidth - 2*margin, height: 22, color: colors.darkRed });
      let hhx = margin + 6;
      hHeaders.forEach((h, i) => {
        currentPage.drawText(h, { x: hhx, y: y - 12, size: 9, font: fontBold, color: colors.white });
        hhx += hColW[i];
      });
      y -= 24;

      houses.slice(0, 12).forEach((h, i) => {
        checkSpace(28);
        const rowColor = i % 2 === 0 ? rgb(0.98, 0.975, 0.96) : colors.white;
        currentPage.drawRectangle({ x: margin, y: y - 18, width: pageWidth - 2*margin, height: 22, color: rowColor, borderColor: colors.gray, borderWidth: 0.4 });

        const hData = [
          'H' + (h.number || i+1),
          cleanText(h.sign || 'N/A'),
          cleanText(h.lord || 'N/A')
        ];
        let tx = margin + 6;
        hData.forEach((text, j) => {
          currentPage.drawText(text, { x: tx, y: y - 12, size: 8.5, font: j === 0 ? fontBold : font, color: colors.black });
          tx += hColW[j];
        });
        y -= 24;
      });
      y -= 8;
    }

    // 6. VEDIC DETAILS
    checkSpace(160);
    currentPage.drawText('VEDIC DETAILS', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
    y -= 25;

    const vedicData = [
      ['Yoga', yoga], ['Tithi', tithi], ['Karana', karana], ['Gan', gan],
      ['Nadi', nadi], ['Varna', varna], ['Vashya', vashya], ['Yoni', yoni],
      ['Tatva', tatva], ['Paya', paya], ['Alphabet', nameAlphabet], ['Sign Lord', signLord]
    ];

    const vColW = (pageWidth - 2*margin - 25) / 2;
    let vy = y;
    let vcol = 0;
    vedicData.forEach(([label, value]) => {
      const x = margin + vcol * (vColW + 25);
      currentPage.drawRectangle({ x, y: vy - 22, width: vColW, height: 26, color: colors.lightPurple, borderColor: colors.gray, borderWidth: 0.5 });
      currentPage.drawText(label + ':', { x: x + 8, y: vy - 14, size: 9, font: fontBold, color: colors.darkGray });
      currentPage.drawText(value, { x: x + 80, y: vy - 14, size: 9, font: font, color: colors.black });
      vcol++;
      if (vcol === 2) { vcol = 0; vy -= 32; }
    });
    y = vy - 15;

    // 7. DASHA
    checkSpace(70);
    currentPage.drawText('CURRENT DASHA', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
    y -= 25;
    currentPage.drawRectangle({ x: margin, y: y - 38, width: pageWidth - 2*margin, height: 48, color: colors.lightGold, borderColor: colors.gold, borderWidth: 1.5 });
    currentPage.drawText('Maha Dasha : ' + mahaDasha, { x: margin + 25, y: y - 20, size: 10, font: fontBold, color: colors.darkGray });
    currentPage.drawText('Antar Dasha : ' + antarDasha, { x: margin + 230, y: y - 20, size: 10, font: fontBold, color: colors.darkGray });
    currentPage.drawText('Ends : ' + dashaEndDate, { x: margin + 25, y: y - 35, size: 9.5, font: font, color: colors.darkGray });
    y -= 60;

    // 8. PANCHANG
    checkSpace(160);
    currentPage.drawText('PANCHANG', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
    y -= 25;

    const panchangList = [
      ['Sunrise', sunrise], ['Sunset', sunset], ['Moonrise', moonrise],
      ['Tithi', panchangTithi], ['Nakshatra', panchangNakshatra],
      ['Yoga', panchangYoga], ['Karana', panchangKarana], ['Paksha', paksha]
    ];

    let py = y;
    let pcol = 0;
    const pColW = (pageWidth - 2*margin - 20) / 2;
    
    panchangList.forEach(([label, val]) => {
      const x = margin + (pcol % 2) * (pColW + 20);
      currentPage.drawRectangle({ x, y: py - 22, width: pColW, height: 26, color: colors.lightGreen, borderColor: colors.gray, borderWidth: 0.5 });
      currentPage.drawText(label + ': ' + val, { x: x + 8, y: py - 14, size: 9, font: font, color: colors.black });
      if (pcol % 2 === 1) py -= 32;
      pcol++;
    });
    y = py - 15;

    // 9. MUHURAT
    if (rahuKaal !== 'N/A' || yamaganda !== 'N/A' || gulika !== 'N/A') {
      checkSpace(70);
      currentPage.drawText('MUHURAT TIMINGS', { x: margin, y: y, size: 13, font: fontBold, color: colors.darkRed });
      y -= 25;

      const muhurats = [
        ['Rahu Kaal', rahuKaal, rgb(0.7, 0.1, 0.1)],
        ['Yamaganda', yamaganda, rgb(0.9, 0.55, 0.1)],
        ['Gulika', gulika, rgb(0.1, 0.6, 0.3)]
      ];

      const mW = (pageWidth - 2*margin - 30) / 3;
      muhurats.forEach((item, i) => {
        const x = margin + i * (mW + 15);
        currentPage.drawRectangle({ x, y: y - 25, width: mW, height: 32, color: item[2] });
        currentPage.drawText(item[0], { x: x + 8, y: y - 12, size: 8.5, font: fontBold, color: colors.white });
        currentPage.drawText(item[1], { x: x + 8, y: y - 24, size: 8.5, font: font, color: colors.white });
      });
    }

    // Footer
    currentPage.drawText('This is a computer generated Vedic astrology report for reference only.', {
      x: pageWidth/2 - 170, y: 38, size: 8, font: font, color: colors.gray
    });
    currentPage.drawText('(c) ' + new Date().getFullYear() + ' AstroPlanets', {
      x: pageWidth/2 - 65, y: 23, size: 8, font: font, color: colors.gray
    });

    // ========== SAVE ==========
    const pdfBytes = await pdfDoc.save();

    console.log('PDF generated successfully. Size:', pdfBytes.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + userName.replace(/[^a-zA-Z0-9]/g, '_') + '_kundli_report.pdf');
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF: ' + error.message 
    });
  }
});


// ================== SAVE PURCHASED KUNDLI ==================
router.post('/save-purchased-kundli', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, birthDetails } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.savedCharts) {
      user.savedCharts = [];
    }

    user.savedCharts.push({
      birthDetails: {
        date: birthDetails.date,
        month: birthDetails.month,
        year: birthDetails.year,
        hour: birthDetails.hour,
        minute: birthDetails.minute,
        latitude: birthDetails.latitude,
        longitude: birthDetails.longitude,
        timezone: birthDetails.timezone
      },
      kundliData: kundliData,
      panchangData: panchangData,
      purchasedAt: new Date(),
      isPaid: true
    });
    
    await user.save();
    
    res.json({ success: true, message: 'Kundli saved to profile successfully' });
  } catch (err) {
    console.error('Save kundli error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/admin/all-kundlis', async (req, res) => {
  try {
    console.log('🔍 Admin fetching all kundlis from all users...');
    
    // Get all users with their saved charts
    const allUsers = await User.find({}, 'fullName email savedCharts createdAt');
    
    const allKundlis = [];
    
    for (const user of allUsers) {
      if (user.savedCharts && user.savedCharts.length > 0) {
        for (const chart of user.savedCharts) {
          allKundlis.push({
            _id: chart._id,
            userId: user._id,
            userName: user.fullName || user.email,
            userEmail: user.email,
            birthDetails: chart.birthDetails || null,
            kundliData: chart.kundliData || {},
            panchangData: chart.panchangData || {},
            createdAt: chart.createdAt || chart.purchasedAt || user.createdAt,
            purchasedAt: chart.purchasedAt,
            isPaid: chart.isPaid !== false
          });
        }
      }
    }
    
    console.log(`✅ Admin: Returning ${allKundlis.length} kundlis from ${allUsers.length} users`);
    
    res.json({ 
      success: true, 
      kundlis: allKundlis,
      totalUsers: allUsers.length,
      totalKundlis: allKundlis.length
    });
    
  } catch (err) {
    console.error('❌ Admin fetch kundlis error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch kundlis: ' + err.message 
    });
  }
});

// ================== GET PURCHASED KUNDLIS (FIXED VERSION) ==================
router.get('/my-purchased-kundlis', protect, async (req, res) => {
  try {
    console.log('🔍 Fetching purchased kundlis for user:', req.user._id);
    
    // First check if user exists
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log('❌ User not found:', req.user._id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Safely get savedCharts
    const allCharts = user.savedCharts || [];
    console.log(`📊 Total charts in DB: ${allCharts.length}`);
    
    // Process charts safely
    const purchasedKundlis = [];
    
    for (let i = 0; i < allCharts.length; i++) {
      const chart = allCharts[i];
      
      // Create a clean copy of the chart data
      const cleanChart = {
        _id: chart._id || `temp_${i}`,
        birthDetails: chart.birthDetails || null,
        kundliData: chart.kundliData || {},
        panchangData: chart.panchangData || {},
        createdAt: chart.createdAt || chart.purchasedAt || new Date(),
        purchasedAt: chart.purchasedAt || chart.createdAt || new Date(),
        isPaid: chart.isPaid !== false
      };
      
      // Ensure kundliData has required fields
      if (!cleanChart.kundliData.lagna && cleanChart.kundliData.ascendant_sign) {
        cleanChart.kundliData.lagna = cleanChart.kundliData.ascendant_sign;
      }
      if (!cleanChart.kundliData.rashi && cleanChart.kundliData.sign) {
        cleanChart.kundliData.rashi = cleanChart.kundliData.sign;
      }
      
      purchasedKundlis.push(cleanChart);
    }
    
    console.log(`✅ Returning ${purchasedKundlis.length} kundlis`);
    
    res.json({ 
      success: true, 
      kundlis: purchasedKundlis,
      totalCharts: allCharts.length,
      count: purchasedKundlis.length
    });
    
  } catch (err) {
    console.error('❌ Error in my-purchased-kundlis:', err);
    console.error('Error stack:', err.stack);
    
    // Send proper error response
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch kundlis: ' + (err.message || 'Internal server error'),
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// ================== SAVE CHART ==================
router.post('/save', protect, async (req, res) => {
  try {
    const { birthDetails, kundliData, panchangData } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.savedCharts = user.savedCharts || [];
    user.savedCharts.push({ birthDetails, kundliData, panchangData, createdAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Chart saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================== GET SAVED CHARTS ==================
router.get('/saved', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, charts: user.savedCharts || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ================== DELETE SAVED CHART ==================
router.delete('/saved/:chartId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.savedCharts = user.savedCharts.filter(c => c._id.toString() !== req.params.chartId);
    await user.save();
    res.json({ success: true, message: 'Chart deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;