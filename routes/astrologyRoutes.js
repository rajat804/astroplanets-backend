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

// ================== DOWNLOAD PDF - PRODUCTION FIXED ==================
router.post('/download-pdf', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
    console.log('📥 Generating PDF for user:', req.user?._id || 'Unknown');
    
    // ========== SANITIZER - REMOVES EMOJIS AND SPECIAL UNICODE ==========
    const sanitize = (text) => {
      if (text === null || text === undefined) return 'N/A';
      return String(text)
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE0F}]/gu, '')
        .replace(/[✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿❀❁❂❃]/g, '')
        .trim();
    };
    
    // Helper function
    const getValue = (obj, key, defaultValue = 'N/A') => {
      if (!obj) return defaultValue;
      if (Array.isArray(key)) {
        let current = obj;
        for (const k of key) {
          if (current && current[k] !== undefined && current[k] !== null && current[k] !== '') {
            current = current[k];
          } else {
            return defaultValue;
          }
        }
        return current;
      }
      const value = obj[key];
      return (value !== undefined && value !== null && value !== '') ? value : defaultValue;
    };
    
    // Get user details - sanitized
    const userName = sanitize(userDetails?.name || req.user?.fullName || req.user?.name || 'User');
    const userEmail = sanitize(userDetails?.email || req.user?.email || 'Not provided');
    
    // Extract data
    const kundli = kundliData || {};
    const panchang = panchangData || {};
    const birth = userDetails?.birthDetails || {};
    
    // Birth Details - sanitized
    const birthDate = birth.date && birth.month && birth.year 
      ? `${birth.date}/${birth.month}/${birth.year}` 
      : 'N/A';
    const birthTime = birth.hour && birth.minute 
      ? `${birth.hour}:${birth.minute}` 
      : 'N/A';
    
    // Basic Details - sanitized
    const ascendant = sanitize(getValue(kundli, 'ascendant_sign') || getValue(kundli, 'lagna') || 'N/A');
    const ascendantLord = sanitize(getValue(kundli, 'ascendant_lord') || getValue(kundli, 'lagna_lord') || 'N/A');
    const rashi = sanitize(getValue(kundli, 'rashi') || getValue(kundli, 'sign') || 'N/A');
    const signLord = sanitize(getValue(kundli, 'sign_lord') || 'N/A');
    const nakshatra = sanitize(getValue(kundli, 'nakshatra') || 'N/A');
    const nakshatraLord = sanitize(getValue(kundli, 'nakshatra_lord') || 'N/A');
    const nakshatraPada = sanitize(getValue(kundli, 'nakshatra_pada') || 'N/A');
    const manglik = sanitize(getValue(kundli, 'manglik') || 'No');
    
    // Vedic Details - sanitized
    const yoga = sanitize(getValue(kundli, 'yoga') || 'N/A');
    const tithi = sanitize(getValue(kundli, 'tithi') || 'N/A');
    const karana = sanitize(getValue(kundli, 'karana') || 'N/A');
    const gan = sanitize(getValue(kundli, 'gan') || 'N/A');
    const nadi = sanitize(getValue(kundli, 'nadi') || 'N/A');
    const varna = sanitize(getValue(kundli, 'varna') || 'N/A');
    const vashya = sanitize(getValue(kundli, 'vashya') || 'N/A');
    const yoni = sanitize(getValue(kundli, 'yoni') || 'N/A');
    const tatva = sanitize(getValue(kundli, 'tatva') || 'N/A');
    const paya = sanitize(getValue(kundli, 'paya') || 'N/A');
    const nameAlphabet = sanitize(getValue(kundli, 'name_alphabet') || 'N/A');
    
    // Planets - sanitized
    const planets = kundli.planets || {};
    const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
    const planetNames = { 
      sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', 
      jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', 
      rahu: 'Rahu', ketu: 'Ketu' 
    };
    
    // Houses
    const houses = kundli.houses || [];
    
    // Dasha - sanitized
    const mahaDasha = sanitize(getValue(kundli, ['dasha', 'maha_dasha']) || 'N/A');
    const antarDasha = sanitize(getValue(kundli, ['dasha', 'antar_dasha']) || 'N/A');
    const dashaEndDate = sanitize(getValue(kundli, ['dasha', 'end_date']) || 'N/A');
    
    // Panchang - sanitized
    const sunrise = sanitize(getValue(panchang, 'sunrise') || 'N/A');
    const sunset = sanitize(getValue(panchang, 'sunset') || 'N/A');
    const moonrise = sanitize(getValue(panchang, 'moonrise') || 'N/A');
    const panchangTithi = sanitize(getValue(panchang, 'tithi') || 'N/A');
    const panchangNakshatra = sanitize(getValue(panchang, 'nakshatra') || 'N/A');
    const panchangYoga = sanitize(getValue(panchang, 'yog') || getValue(panchang, 'yoga') || 'N/A');
    const panchangKarana = sanitize(getValue(panchang, 'karan') || getValue(panchang, 'karana') || 'N/A');
    const paksha = sanitize(getValue(panchang, 'paksha') || 'N/A');
    
    // ========== CREATE PDF - USING CORE FONT ==========
    console.log('📄 Creating PDF with pdf-lib...');
    
    const pdfDoc = await PDFDocument.create();
    
    // ✅ CRITICAL FIX: Use Helvetica directly from pdf-lib's built-in fonts
    // Don't embed custom fonts - they fail in serverless environments
    const font = await pdfDoc.embedFont('Helvetica');
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
    
    // Hardcoded Letter size (612 x 792)
    const width = 612;
    const height = 792;
    
    // Colors
    const darkRed = rgb(0.545, 0, 0);
    const gold = rgb(0.831, 0.627, 0.09);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const white = rgb(1, 1, 1);
    const lightRed = rgb(0.996, 0.949, 0.949);
    const lightGold = rgb(0.996, 0.99, 0.91);
    const lightGreen = rgb(0.94, 0.99, 0.94);
    
    // ==================== COVER PAGE ====================
    const page1 = pdfDoc.addPage();
    let y = height - 50;
    const margin = 50;
    
    // Draw border
    page1.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: gold,
      borderWidth: 2,
    });
    
    // Title - NO EMOJIS
    page1.drawText('ASTROPLANETS', {
      x: width / 2 - 120,
      y: height - 120,
      size: 34,
      font: fontBold,
      color: darkRed,
    });
    
    page1.drawText('Vedic Astrology', {
      x: width / 2 - 60,
      y: height - 160,
      size: 16,
      font: font,
      color: gold,
    });
    
    // Divider line
    page1.drawLine({
      start: { x: width / 2 - 100, y: height - 190 },
      end: { x: width / 2 + 100, y: height - 190 },
      thickness: 2,
      color: gold,
    });
    
    // User Name
    page1.drawText(userName, {
      x: width / 2 - 80,
      y: height - 240,
      size: 24,
      font: fontBold,
      color: black,
    });
    
    // Birth Details - NO EMOJIS
    const detailsY = height - 300;
    page1.drawText(`Date of Birth: ${birthDate}`, {
      x: width / 2 - 120,
      y: detailsY,
      size: 12,
      font: font,
      color: darkGray,
    });
    page1.drawText(`Time of Birth: ${birthTime}`, {
      x: width / 2 - 120,
      y: detailsY - 25,
      size: 12,
      font: font,
      color: darkGray,
    });
    page1.drawText(`Rashi: ${rashi}  |  Nakshatra: ${nakshatra}`, {
      x: width / 2 - 120,
      y: detailsY - 50,
      size: 12,
      font: font,
      color: darkGray,
    });
    page1.drawText(`Lagna: ${ascendant}`, {
      x: width / 2 - 120,
      y: detailsY - 75,
      size: 12,
      font: font,
      color: darkGray,
    });
    
    // Footer - NO EMOJIS
    page1.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: width / 2 - 80,
      y: 60,
      size: 10,
      font: font,
      color: gray,
    });
    page1.drawText(`(c) ${new Date().getFullYear()} AstroPlanets - All Rights Reserved`, {
      x: width / 2 - 140,
      y: 40,
      size: 10,
      font: font,
      color: gray,
    });
    
    // ==================== DATA PAGE ====================
    const page2 = pdfDoc.addPage();
    let y2 = height - 40;
    
    // Header - NO EMOJIS
    page2.drawText('ASTROPLANETS', {
      x: margin,
      y: y2,
      size: 20,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 30;
    
    page2.drawText(userName, {
      x: margin,
      y: y2,
      size: 14,
      font: font,
      color: gold,
    });
    y2 -= 35;
    
    // ======== LAGNA ========
    page2.drawRectangle({
      x: margin,
      y: y2 - 60,
      width: width - 2 * margin,
      height: 70,
      color: lightRed,
      borderColor: darkRed,
      borderWidth: 1,
    });
    
    page2.drawText('LAGNA (ASCENDANT)', {
      x: width / 2 - 80,
      y: y2 - 20,
      size: 12,
      font: fontBold,
      color: darkRed,
    });
    page2.drawText(ascendant, {
      x: width / 2 - 60,
      y: y2 - 50,
      size: 24,
      font: fontBold,
      color: darkRed,
    });
    page2.drawText(`Lord: ${ascendantLord}`, {
      x: width / 2 - 40,
      y: y2 - 70,
      size: 11,
      font: font,
      color: darkGray,
    });
    y2 -= 80;
    
    // ======== RASHI & NAKSHATRA ========
    page2.drawText('RASHI & NAKSHATRA', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 25;
    
    page2.drawRectangle({
      x: margin,
      y: y2 - 80,
      width: width - 2 * margin,
      height: 85,
      borderColor: black,
      borderWidth: 1,
    });
    
    // Row 1
    page2.drawText('Rashi (Moon Sign)', { x: margin + 10, y: y2 - 15, size: 11, font: fontBold, color: darkGray });
    page2.drawText(rashi, { x: width / 2, y: y2 - 15, size: 11, font: font, color: black });
    y2 -= 20;
    page2.drawLine({
      start: { x: margin + 10, y: y2 + 5 },
      end: { x: width - margin - 10, y: y2 + 5 },
      thickness: 1,
      color: gray,
    });
    
    // Row 2
    page2.drawText('Sign Lord', { x: margin + 10, y: y2 - 15, size: 11, font: fontBold, color: darkGray });
    page2.drawText(signLord, { x: width / 2, y: y2 - 15, size: 11, font: font, color: black });
    y2 -= 20;
    page2.drawLine({
      start: { x: margin + 10, y: y2 + 5 },
      end: { x: width - margin - 10, y: y2 + 5 },
      thickness: 1,
      color: gray,
    });
    
    // Row 3
    page2.drawText('Nakshatra (Birth Star)', { x: margin + 10, y: y2 - 15, size: 11, font: fontBold, color: darkGray });
    page2.drawText(nakshatra, { x: width / 2, y: y2 - 15, size: 11, font: font, color: black });
    y2 -= 20;
    page2.drawLine({
      start: { x: margin + 10, y: y2 + 5 },
      end: { x: width - margin - 10, y: y2 + 5 },
      thickness: 1,
      color: gray,
    });
    
    // Row 4
    page2.drawText('Nakshatra Lord / Pada', { x: margin + 10, y: y2 - 15, size: 11, font: fontBold, color: darkGray });
    page2.drawText(`${nakshatraLord} / ${nakshatraPada}`, { x: width / 2, y: y2 - 15, size: 11, font: font, color: black });
    y2 -= 25;
    
    // ======== MANGLIK ========
    const isManglik = manglik === 'Yes' || manglik === 'Manglik';
    const manglikBg = isManglik ? darkRed : rgb(0.91, 0.94, 0.91);
    const manglikTextColor = isManglik ? white : black;
    
    page2.drawRectangle({
      x: margin,
      y: y2 - 35,
      width: width - 2 * margin,
      height: 40,
      color: manglikBg,
      borderColor: isManglik ? darkRed : rgb(0, 0.6, 0),
      borderWidth: 1,
    });
    page2.drawText(`MANGAL DOSHA: ${isManglik ? 'Manglik' : 'Non-Manglik'}`, {
      x: width / 2 - 80,
      y: y2 - 22,
      size: 14,
      font: fontBold,
      color: manglikTextColor,
    });
    y2 -= 45;
    
    // ======== PLANETS TABLE ========
    page2.drawText('PLANETARY POSITIONS', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 25;
    
    // Table header
    const tableX = margin;
    const tableY = y2;
    const tableWidth = width - 2 * margin;
    const colWidths = [70, 60, 50, 50, 60];
    
    page2.drawRectangle({
      x: tableX,
      y: tableY - 25,
      width: tableWidth,
      height: 25,
      color: darkRed,
    });
    
    const headers = ['Planet', 'Sign', 'Degree', 'House', 'Retrograde'];
    let hX = tableX + 5;
    for (let i = 0; i < headers.length; i++) {
      page2.drawText(headers[i], {
        x: hX,
        y: tableY - 18,
        size: 10,
        font: fontBold,
        color: white,
      });
      hX += colWidths[i];
    }
    
    y2 -= 25;
    let rowY2 = y2;
    
    for (const planet of planetList) {
      const pData = planets[planet] || {};
      const isRetrograde = pData.retrograde ? 'Yes' : 'No';
      
      // Row background
      const rowBg = planetList.indexOf(planet) % 2 === 0 ? rgb(0.98, 0.975, 0.96) : white;
      page2.drawRectangle({
        x: tableX,
        y: rowY2 - 18,
        width: tableWidth,
        height: 20,
        color: rowBg,
        borderColor: gray,
        borderWidth: 0.5,
      });
      
      const planetName = sanitize(pData.name || planetNames[planet] || planet);
      const planetSign = sanitize(pData.sign || 'N/A');
      const planetDegree = sanitize(pData.degree || 'N/A');
      const planetHouse = sanitize(pData.house || 'N/A');
      
      const rowData = [
        planetName,
        planetSign,
        `${planetDegree}°`,
        planetHouse,
        isRetrograde
      ];
      
      let rX = tableX + 5;
      for (let i = 0; i < rowData.length; i++) {
        page2.drawText(rowData[i], {
          x: rX,
          y: rowY2 - 13,
          size: 9,
          font: i === 0 ? fontBold : font,
          color: black,
        });
        rX += colWidths[i];
      }
      
      rowY2 -= 20;
    }
    
    y2 = rowY2 - 10;
    
    // ======== HOUSES TABLE ========
    if (houses.length > 0) {
      page2.drawText('HOUSES (BHAVAS)', {
        x: margin,
        y: y2,
        size: 14,
        font: fontBold,
        color: darkRed,
      });
      y2 -= 25;
      
      const hTableX = margin;
      const hTableY = y2;
      const hTableWidth = width - 2 * margin;
      const hColWidths = [80, 100, 100];
      
      // Header
      page2.drawRectangle({
        x: hTableX,
        y: hTableY - 20,
        width: hTableWidth,
        height: 22,
        color: darkRed,
      });
      
      const hHeaders = ['House', 'Sign', 'Lord'];
      let hhX = hTableX + 5;
      for (let i = 0; i < hHeaders.length; i++) {
        page2.drawText(hHeaders[i], {
          x: hhX,
          y: hTableY - 14,
          size: 10,
          font: fontBold,
          color: white,
        });
        hhX += hColWidths[i];
      }
      
      y2 -= 22;
      let hRowY = y2;
      
      for (let i = 0; i < Math.min(12, houses.length); i++) {
        const house = houses[i] || {};
        const houseNum = house.number || i + 1;
        const houseSign = sanitize(house.sign || 'N/A');
        const houseLord = sanitize(house.lord || 'N/A');
        
        const rowBg = i % 2 === 0 ? rgb(0.98, 0.975, 0.96) : white;
        page2.drawRectangle({
          x: hTableX,
          y: hRowY - 18,
          width: hTableWidth,
          height: 20,
          color: rowBg,
          borderColor: gray,
          borderWidth: 0.5,
        });
        
        const hRowData = [`House ${houseNum}`, houseSign, houseLord];
        let hrX = hTableX + 5;
        for (let j = 0; j < hRowData.length; j++) {
          page2.drawText(hRowData[j], {
            x: hrX,
            y: hRowY - 13,
            size: 9,
            font: j === 0 ? fontBold : font,
            color: black,
          });
          hrX += hColWidths[j];
        }
        hRowY -= 20;
      }
      y2 = hRowY - 10;
    }
    
    // ======== VEDIC DETAILS ========
    page2.drawText('VEDIC DETAILS', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 25;
    
    const vedicData = [
      ['Yoga', yoga],
      ['Tithi', tithi],
      ['Karana', karana],
      ['Gan', gan],
      ['Nadi', nadi],
      ['Varna', varna],
      ['Vashya', vashya],
      ['Yoni', yoni],
      ['Sign Lord', signLord],
      ['Tatva', tatva],
      ['Paya', paya],
      ['Alphabet', nameAlphabet]
    ];
    
    const colWidth = (width - 2 * margin) / 2 - 10;
    let rowY = y2;
    let colCount = 0;
    
    for (const [label, value] of vedicData) {
      const xPos = colCount === 0 ? margin : margin + colWidth + 10;
      const yPos = rowY;
      
      page2.drawRectangle({
        x: xPos,
        y: yPos - 20,
        width: colWidth,
        height: 22,
        color: rgb(0.98, 0.975, 0.96),
        borderColor: rgb(0.91, 0.89, 0.87),
        borderWidth: 1,
      });
      
      page2.drawText(`${label}:`, {
        x: xPos + 5,
        y: yPos - 15,
        size: 9,
        font: fontBold,
        color: darkGray,
      });
      page2.drawText(value, {
        x: xPos + colWidth - 60,
        y: yPos - 15,
        size: 9,
        font: font,
        color: black,
      });
      
      colCount++;
      if (colCount === 2) {
        colCount = 0;
        rowY -= 28;
      }
    }
    
    y2 = rowY - 15;
    
    // ======== DASHA ========
    page2.drawText('CURRENT VIMSHOTTARI DASHA', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 25;
    
    page2.drawRectangle({
      x: margin,
      y: y2 - 40,
      width: width - 2 * margin,
      height: 45,
      color: lightGold,
      borderColor: rgb(0.996, 0.95, 0.78),
      borderWidth: 1,
    });
    
    page2.drawText(`Maha Dasha: ${mahaDasha}`, {
      x: width / 2 - 130,
      y: y2 - 28,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    page2.drawText(`Antar Dasha: ${antarDasha}`, {
      x: width / 2 - 20,
      y: y2 - 28,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    page2.drawText(`Valid Until: ${dashaEndDate}`, {
      x: width / 2 + 80,
      y: y2 - 28,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    y2 -= 50;
    
    // ======== PANCHANG ========
    page2.drawText('DAILY PANCHANG', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 25;
    
    const panchangDataList = [
      ['Sunrise', sunrise],
      ['Sunset', sunset],
      ['Moonrise', moonrise],
      ['Tithi', panchangTithi],
      ['Nakshatra', panchangNakshatra],
      ['Yoga', panchangYoga],
      ['Karana', panchangKarana],
      ['Paksha', paksha]
    ];
    
    let pY = y2;
    let pCol = 0;
    const pColWidth = (width - 2 * margin) / 2 - 10;
    
    for (const [label, value] of panchangDataList) {
      const xPos = pCol === 0 ? margin : margin + pColWidth + 10;
      const yPos = pY;
      
      page2.drawRectangle({
        x: xPos,
        y: yPos - 18,
        width: pColWidth,
        height: 20,
        color: lightGreen,
        borderColor: rgb(0.86, 0.97, 0.86),
        borderWidth: 1,
      });
      
      page2.drawText(`${label}:`, {
        x: xPos + 5,
        y: yPos - 13,
        size: 9,
        font: fontBold,
        color: darkGray,
      });
      page2.drawText(value, {
        x: xPos + pColWidth - 60,
        y: yPos - 13,
        size: 9,
        font: font,
        color: black,
      });
      
      pCol++;
      if (pCol === 2) {
        pCol = 0;
        pY -= 25;
      }
    }
    
    // ======== FOOTER ========
    const footerY = 30;
    page2.drawText('This report is based on Vedic astrology calculations.', {
      x: width / 2 - 130,
      y: footerY + 10,
      size: 8,
      font: font,
      color: gray,
    });
    page2.drawText(`(c) ${new Date().getFullYear()} AstroPlanets - All Rights Reserved`, {
      x: width / 2 - 120,
      y: footerY - 5,
      size: 8,
      font: font,
      color: gray,
    });
    
    // ========== SAVE PDF ==========
    const pdfBytes = await pdfDoc.save();
    
    console.log('✅ PDF generated successfully. Size:', pdfBytes.length);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=kundli_report.pdf');
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    console.error('Error stack:', error.stack);
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