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

// ================== DOWNLOAD PDF - COMPLETE STRUCTURE ==================
// ================== DOWNLOAD PDF - COMPLETE STRUCTURE ==================
router.post('/download-pdf', protect, async (req, res) => {
  try {
    const { kundliData, panchangData, userDetails } = req.body;
    
    console.log('📥 Generating PDF for user:', req.user?._id || 'Unknown');
    
    // ========== SANITIZER ==========
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
    
    // Get user details
    const userName = sanitize(userDetails?.name || req.user?.fullName || req.user?.name || 'User');
    const userEmail = sanitize(userDetails?.email || req.user?.email || 'Not provided');
    
    // Extract data
    const kundli = kundliData || {};
    const panchang = panchangData || {};
    const birth = userDetails?.birthDetails || {};
    
    // Birth Details
    const birthDate = birth.date && birth.month && birth.year 
      ? `${birth.date}/${birth.month}/${birth.year}` 
      : 'N/A';
    const birthTime = birth.hour && birth.minute 
      ? `${birth.hour}:${birth.minute}` 
      : 'N/A';
    
    // Basic Details
    const ascendant = sanitize(getValue(kundli, 'ascendant_sign') || getValue(kundli, 'lagna') || 'N/A');
    const ascendantLord = sanitize(getValue(kundli, 'ascendant_lord') || getValue(kundli, 'lagna_lord') || 'N/A');
    const rashi = sanitize(getValue(kundli, 'rashi') || getValue(kundli, 'sign') || 'N/A');
    const signLord = sanitize(getValue(kundli, 'sign_lord') || 'N/A');
    const nakshatra = sanitize(getValue(kundli, 'nakshatra') || 'N/A');
    const nakshatraLord = sanitize(getValue(kundli, 'nakshatra_lord') || 'N/A');
    const nakshatraPada = sanitize(getValue(kundli, 'nakshatra_pada') || 'N/A');
    const manglik = sanitize(getValue(kundli, 'manglik') || 'No');
    
    // Vedic Details
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
    
    // Planets
    const planets = kundli.planets || {};
    const planetList = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
    const planetNames = { 
      sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury', 
      jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn', 
      rahu: 'Rahu', ketu: 'Ketu' 
    };
    
    // Houses
    const houses = kundli.houses || [];
    
    // Dasha
    const mahaDasha = sanitize(getValue(kundli, ['dasha', 'maha_dasha']) || 'N/A');
    const antarDasha = sanitize(getValue(kundli, ['dasha', 'antar_dasha']) || 'N/A');
    const dashaEndDate = sanitize(getValue(kundli, ['dasha', 'end_date']) || 'N/A');
    
    // Panchang
    const sunrise = sanitize(getValue(panchang, 'sunrise') || 'N/A');
    const sunset = sanitize(getValue(panchang, 'sunset') || 'N/A');
    const moonrise = sanitize(getValue(panchang, 'moonrise') || 'N/A');
    const panchangTithi = sanitize(getValue(panchang, 'tithi') || 'N/A');
    const panchangNakshatra = sanitize(getValue(panchang, 'nakshatra') || 'N/A');
    const panchangYoga = sanitize(getValue(panchang, 'yog') || getValue(panchang, 'yoga') || 'N/A');
    const panchangKarana = sanitize(getValue(panchang, 'karan') || getValue(panchang, 'karana') || 'N/A');
    const paksha = sanitize(getValue(panchang, 'paksha') || 'N/A');
    const rahuKaal = sanitize(getValue(panchang, 'rahukaal') || 'N/A');
    const yamaganda = sanitize(getValue(panchang, 'yamaganda') || 'N/A');
    const gulika = sanitize(getValue(panchang, 'gulika') || 'N/A');
    
    // ========== CREATE PDF ==========
    console.log('📄 Creating PDF...');
    
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const width = 612;
    const height = 792;
    const margin = 50;
    
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
    const lightBlue = rgb(0.94, 0.97, 0.99);
    const lightPurple = rgb(0.97, 0.94, 0.99);
    
    // ==================== PAGE 1: COVER ====================
    const page1 = pdfDoc.addPage();
    
    // Decorative border
    page1.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: gold,
      borderWidth: 2,
    });
    
    // Inner border
    page1.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: gold,
      borderWidth: 0.5,
    });
    
    // Top line
    page1.drawLine({
      start: { x: 50, y: height - 70 },
      end: { x: width - 50, y: height - 70 },
      thickness: 1,
      color: gold,
    });
    
    // Main Title
    page1.drawText('A S T R O P L A N E T S', {
      x: width / 2 - 160,
      y: height - 140,
      size: 36,
      font: fontBold,
      color: darkRed,
    });
    
    // Subtitle
    page1.drawText('Vedic Astrology Birth Chart Report', {
      x: width / 2 - 130,
      y: height - 180,
      size: 16,
      font: font,
      color: gold,
    });
    
    // Divider
    page1.drawLine({
      start: { x: width / 2 - 80, y: height - 210 },
      end: { x: width / 2 + 80, y: height - 210 },
      thickness: 2,
      color: gold,
    });
    
    // User Name
    page1.drawText(userName, {
      x: width / 2 - 80,
      y: height - 260,
      size: 28,
      font: fontBold,
      color: darkRed,
    });
    
    // Birth Details Box
    const boxY = height - 350;
    page1.drawRectangle({
      x: width / 2 - 180,
      y: boxY,
      width: 360,
      height: 180,
      color: lightRed,
      borderColor: darkRed,
      borderWidth: 1,
    });
    
    let detailY = boxY + 30;
    page1.drawText('BIRTH DETAILS', {
      x: width / 2 - 80,
      y: detailY,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    detailY += 25;
    
    page1.drawText(`Date of Birth: ${birthDate}`, {
      x: width / 2 - 150,
      y: detailY,
      size: 12,
      font: font,
      color: darkGray,
    });
    detailY += 20;
    
    page1.drawText(`Time of Birth: ${birthTime}`, {
      x: width / 2 - 150,
      y: detailY,
      size: 12,
      font: font,
      color: darkGray,
    });
    detailY += 20;
    
    page1.drawText(`Rashi: ${rashi}`, {
      x: width / 2 - 150,
      y: detailY,
      size: 12,
      font: font,
      color: darkGray,
    });
    detailY += 20;
    
    page1.drawText(`Nakshatra: ${nakshatra}`, {
      x: width / 2 - 150,
      y: detailY,
      size: 12,
      font: font,
      color: darkGray,
    });
    detailY += 20;
    
    page1.drawText(`Lagna: ${ascendant}`, {
      x: width / 2 - 150,
      y: detailY,
      size: 12,
      font: font,
      color: darkGray,
    });
    
    // Footer
    page1.drawText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: width / 2 - 80,
      y: 60,
      size: 10,
      font: font,
      color: gray,
    });
    page1.drawText(`(c) ${new Date().getFullYear()} AstroPlanets - All Rights Reserved`, {
      x: width / 2 - 150,
      y: 40,
      size: 10,
      font: font,
      color: gray,
    });
    
    // ==================== PAGE 2: KUNDLI DATA ====================
    const page2 = pdfDoc.addPage();
    let y2 = height - 40;
    
    // Header
    page2.drawText('ASTROPLANETS', {
      x: margin,
      y: y2,
      size: 18,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 25;
    
    page2.drawText(`Kundli Report: ${userName}`, {
      x: margin,
      y: y2,
      size: 12,
      font: font,
      color: gold,
    });
    y2 -= 35;
    
    // ===== 1. LAGNA =====
    page2.drawRectangle({
      x: margin,
      y: y2 - 55,
      width: width - 2 * margin,
      height: 65,
      color: darkRed,
    });
    
    page2.drawText('LAGNA (ASCENDANT)', {
      x: width / 2 - 85,
      y: y2 - 22,
      size: 12,
      font: fontBold,
      color: white,
    });
    page2.drawText(ascendant, {
      x: width / 2 - 60,
      y: y2 - 48,
      size: 26,
      font: fontBold,
      color: gold,
    });
    page2.drawText(`Lord: ${ascendantLord}`, {
      x: width / 2 - 40,
      y: y2 - 62,
      size: 11,
      font: font,
      color: white,
    });
    y2 -= 70;
    
    // ===== 2. RASHI & NAKSHATRA =====
    page2.drawText('RASHI & NAKSHATRA', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 20;
    
    const rashiData = [
      ['Rashi (Moon Sign)', rashi],
      ['Sign Lord', signLord],
      ['Nakshatra (Birth Star)', nakshatra],
      ['Nakshatra Lord', nakshatraLord],
      ['Pada / Charan', nakshatraPada]
    ];
    
    const boxW = (width - 2 * margin - 20) / 2;
    let rx = margin;
    let ry = y2 - 20;
    let rc = 0;
    
    for (const [label, value] of rashiData) {
      const xPos = rc % 2 === 0 ? margin : margin + boxW + 20;
      const yPos = ry;
      
      page2.drawRectangle({
        x: xPos,
        y: yPos - 20,
        width: boxW,
        height: 25,
        color: lightBlue,
        borderColor: gray,
        borderWidth: 0.5,
      });
      
      page2.drawText(`${label}: ${value}`, {
        x: xPos + 8,
        y: yPos - 14,
        size: 10,
        font: font,
        color: black,
      });
      
      rc++;
      if (rc % 2 === 0) {
        ry -= 30;
      }
    }
    y2 = ry - 15;
    
    // ===== 3. MANGLIK DOSHA =====
    const isManglik = manglik === 'Yes' || manglik === 'Manglik';
    const manglikBg = isManglik ? rgb(0.8, 0.1, 0.1) : rgb(0.1, 0.6, 0.1);
    
    page2.drawRectangle({
      x: margin,
      y: y2 - 35,
      width: width - 2 * margin,
      height: 40,
      color: manglikBg,
    });
    
    page2.drawText(`MANGAL DOSHA: ${isManglik ? 'Manglik' : 'Non-Manglik'}`, {
      x: width / 2 - 90,
      y: y2 - 23,
      size: 16,
      font: fontBold,
      color: white,
    });
    y2 -= 45;
    
    // ===== 4. PLANETS TABLE =====
    page2.drawText('PLANETARY POSITIONS', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 20;
    
    const tX = margin;
    const tY = y2;
    const tW = width - 2 * margin;
    const cW = [70, 65, 50, 50, 65];
    
    // Header
    page2.drawRectangle({
      x: tX,
      y: tY - 22,
      width: tW,
      height: 25,
      color: darkRed,
    });
    
    const headers = ['Planet', 'Sign', 'Degree', 'House', 'Retrograde'];
    let hx = tX + 5;
    for (let i = 0; i < headers.length; i++) {
      page2.drawText(headers[i], {
        x: hx,
        y: tY - 15,
        size: 10,
        font: fontBold,
        color: white,
      });
      hx += cW[i];
    }
    
    y2 -= 25;
    let rowY = y2;
    
    for (let i = 0; i < planetList.length; i++) {
      const planet = planetList[i];
      const pData = planets[planet] || {};
      const isRetro = pData.retrograde ? 'Yes' : 'No';
      
      const rowBg = i % 2 === 0 ? rgb(0.98, 0.975, 0.96) : white;
      page2.drawRectangle({
        x: tX,
        y: rowY - 18,
        width: tW,
        height: 20,
        color: rowBg,
        borderColor: gray,
        borderWidth: 0.5,
      });
      
      const rowData = [
        planetNames[planet] || planet,
        sanitize(pData.sign || 'N/A'),
        `${sanitize(pData.degree || 'N/A')}°`,
        sanitize(pData.house || 'N/A'),
        isRetro
      ];
      
      let rx2 = tX + 5;
      for (let j = 0; j < rowData.length; j++) {
        page2.drawText(rowData[j], {
          x: rx2,
          y: rowY - 13,
          size: 9,
          font: j === 0 ? fontBold : font,
          color: black,
        });
        rx2 += cW[j];
      }
      rowY -= 20;
    }
    y2 = rowY - 10;
    
    // ===== 5. HOUSES TABLE =====
    if (houses.length > 0) {
      page2.drawText('HOUSES (BHAVAS)', {
        x: margin,
        y: y2,
        size: 14,
        font: fontBold,
        color: darkRed,
      });
      y2 -= 20;
      
      const hX = margin;
      const hY = y2;
      const hW = width - 2 * margin;
      const hC = [80, 100, 100];
      
      page2.drawRectangle({
        x: hX,
        y: hY - 20,
        width: hW,
        height: 22,
        color: darkRed,
      });
      
      const hHeaders = ['House', 'Sign', 'Lord'];
      let hhx = hX + 5;
      for (let i = 0; i < hHeaders.length; i++) {
        page2.drawText(hHeaders[i], {
          x: hhx,
          y: hY - 14,
          size: 10,
          font: fontBold,
          color: white,
        });
        hhx += hC[i];
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
          x: hX,
          y: hRowY - 18,
          width: hW,
          height: 20,
          color: rowBg,
          borderColor: gray,
          borderWidth: 0.5,
        });
        
        const hRowData = [`House ${houseNum}`, houseSign, houseLord];
        let hrx = hX + 5;
        for (let j = 0; j < hRowData.length; j++) {
          page2.drawText(hRowData[j], {
            x: hrx,
            y: hRowY - 13,
            size: 9,
            font: j === 0 ? fontBold : font,
            color: black,
          });
          hrx += hC[j];
        }
        hRowY -= 20;
      }
      y2 = hRowY - 10;
    }
    
    // ===== 6. VEDIC DETAILS =====
    page2.drawText('VEDIC DETAILS', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 20;
    
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
    
    const vCW = (width - 2 * margin - 15) / 3;
    let vRow = y2 - 18;
    let vCol = 0;
    
    for (const [label, value] of vedicData) {
      const xPos = margin + (vCol * (vCW + 7));
      const yPos = vRow;
      
      page2.drawRectangle({
        x: xPos,
        y: yPos - 18,
        width: vCW,
        height: 22,
        color: lightPurple,
        borderColor: gray,
        borderWidth: 0.5,
      });
      
      page2.drawText(`${label}: ${value}`, {
        x: xPos + 5,
        y: yPos - 13,
        size: 9,
        font: font,
        color: black,
      });
      
      vCol++;
      if (vCol === 3) {
        vCol = 0;
        vRow -= 26;
      }
    }
    y2 = vRow - 10;
    
    // ===== 7. DASHA =====
    page2.drawText('CURRENT VIMSHOTTARI DASHA', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 20;
    
    page2.drawRectangle({
      x: margin,
      y: y2 - 35,
      width: width - 2 * margin,
      height: 40,
      color: lightGold,
      borderColor: gold,
      borderWidth: 1,
    });
    
    page2.drawText(`Maha Dasha: ${mahaDasha}`, {
      x: width / 2 - 130,
      y: y2 - 24,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    page2.drawText(`Antar Dasha: ${antarDasha}`, {
      x: width / 2 - 20,
      y: y2 - 24,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    page2.drawText(`Valid Until: ${dashaEndDate}`, {
      x: width / 2 + 80,
      y: y2 - 24,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    y2 -= 50;
    
    // ===== 8. PANCHANG =====
    page2.drawText('DAILY PANCHANG', {
      x: margin,
      y: y2,
      size: 14,
      font: fontBold,
      color: darkRed,
    });
    y2 -= 20;
    
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
    
    const pCW = (width - 2 * margin - 10) / 2;
    let pRow = y2 - 18;
    let pCol = 0;
    
    for (const [label, value] of panchangDataList) {
      const xPos = pCol === 0 ? margin : margin + pCW + 10;
      const yPos = pRow;
      
      page2.drawRectangle({
        x: xPos,
        y: yPos - 18,
        width: pCW,
        height: 22,
        color: lightGreen,
        borderColor: rgb(0.86, 0.97, 0.86),
        borderWidth: 0.5,
      });
      
      page2.drawText(`${label}: ${value}`, {
        x: xPos + 5,
        y: yPos - 13,
        size: 10,
        font: font,
        color: black,
      });
      
      pCol++;
      if (pCol === 2) {
        pCol = 0;
        pRow -= 26;
      }
    }
    y2 = pRow - 10;
    
    // ===== 9. MUHURAT TIMINGS =====
    if (rahuKaal !== 'N/A' || yamaganda !== 'N/A' || gulika !== 'N/A') {
      page2.drawText('MUHURAT TIMINGS', {
        x: margin,
        y: y2,
        size: 14,
        font: fontBold,
        color: darkRed,
      });
      y2 -= 20;
      
      const mData = [
        ['Rahu Kaal', rahuKaal, '#ff6b6b'],
        ['Yamaganda', yamaganda, '#ffd93d'],
        ['Gulika', gulika, '#6bcb77']
      ];
      
      const mCW = (width - 2 * margin - 20) / 3;
      let mRow = y2 - 18;
      
      for (const [label, value, color] of mData) {
        const xPos = margin + (mData.indexOf([label, value, color]) * (mCW + 10));
        const yPos = mRow;
        
        const bgColor = color === '#ff6b6b' ? rgb(1, 0.42, 0.42) : 
                        color === '#ffd93d' ? rgb(1, 0.85, 0.24) : 
                        rgb(0.42, 0.8, 0.47);
        
        page2.drawRectangle({
          x: xPos,
          y: yPos - 18,
          width: mCW,
          height: 22,
          color: bgColor,
          borderColor: gray,
          borderWidth: 0.5,
        });
        
        const textColor = color === '#ff6b6b' ? white : black;
        page2.drawText(`${label}: ${value}`, {
          x: xPos + 5,
          y: yPos - 13,
          size: 10,
          font: fontBold,
          color: textColor,
        });
      }
      y2 = mRow - 25;
    }
    
    // ===== FOOTER =====
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