import React, { createContext, useContext, useState } from "react";

type Lang = "en" | "hi";

const translations: Record<string, Record<Lang, string>> = {
  // App name
  appName:           { en: "GauSevak",                                    hi: "गौसेवक" },

  // Stats
  activeCows:        { en: "Active Cows",                                  hi: "सक्रिय गाय" },
  milkToday:         { en: "Milk Today",                                   hi: "आज का दूध" },
  fed:               { en: "Fed",                                          hi: "खिलाया" },

  // Section labels
  quickEntry:        { en: "Quick Entry",                                  hi: "त्वरित प्रविष्टि" },
  pendingToday:      { en: "Pending Today",                                hi: "आज बाकी" },

  // Action cards
  milkLabel:         { en: "Milk Entry",                                   hi: "दूध दर्ज करें" },
  milkDesc:          { en: "Record cow milk yield",                        hi: "गाय का दूध दर्ज करें" },
  feedLabel:         { en: "Feed Status",                                  hi: "चारा स्थिति" },
  feedDesc:          { en: "Mark each cow's feeding",                      hi: "प्रत्येक गाय का चारा चिह्नित करें" },
  healthLabel:       { en: "Health Check",                                 hi: "स्वास्थ्य जांच" },
  healthDesc:        { en: "Log health condition",                         hi: "स्वास्थ्य स्थिति दर्ज करें" },

  // Shifts
  morningShift:      { en: "🌅 Morning",                                  hi: "🌅 सुबह" },
  eveningShift:      { en: "🌆 Evening",                                  hi: "🌆 शाम" },
  morningLabel:      { en: "Morning",                                      hi: "सुबह" },
  eveningLabel:      { en: "Evening",                                      hi: "शाम" },
  morningShiftLabel: { en: "Morning Shift",                                hi: "सुबह की पाली" },
  eveningShiftLabel: { en: "Evening Shift",                                hi: "शाम की पाली" },

  // All done banner
  allTasksDone:      { en: "All tasks complete!",                          hi: "सभी काम पूरे!" },
  allTasksSub:       { en: "Every cow is fed, milked & checked today",     hi: "आज हर गाय को दूध, चारा और जांच मिली" },
  allDone:           { en: "All Done",                                     hi: "सब हो गया" },
  left:              { en: "left",                                         hi: "बचे" },

  // Milk tab
  enterMilkQty:      { en: "Enter milk quantity",                          hi: "दूध की मात्रा दर्ज करें" },
  litres:            { en: "Litres",                                       hi: "लीटर" },
  milkRecorded:      { en: "Milk Recorded!",                               hi: "दूध दर्ज हो गया!" },
  saveBtn:           { en: "Save",                                         hi: "सहेजें" },

  // Feed tab
  notYetFed:         { en: "Not yet fed",                                  hi: "अभी नहीं खाया" },
  tapToMark:         { en: "Tap below to mark",                            hi: "नीचे दबाएं चिह्नित करने के लिए" },
  markAsFed:         { en: "Mark as Fed",                                  hi: "खिला दिया चिह्नित करें" },
  fedCheck:          { en: "Fed ✓",                                        hi: "खिलाया ✓" },
  markedAsFed:       { en: "Marked as fed for",                            hi: "के लिए खिलाया चिह्नित" },
  undo:              { en: "↩ Undo",                                       hi: "↩ पूर्ववत करें" },

  // Health tab
  selectHealth:      { en: "Select health status",                         hi: "स्वास्थ्य स्थिति चुनें" },
  updateHealth:      { en: "Update health status",                         hi: "स्वास्थ्य स्थिति अपडेट करें" },
  currentLabel:      { en: "Current:",                                     hi: "वर्तमान:" },
  healthy:           { en: "Healthy",                                      hi: "स्वस्थ" },
  fever:             { en: "Fever",                                        hi: "बुखार" },
  upsetStomach:      { en: "Upset Stomach",                                hi: "पेट खराब" },
  injury:            { en: "Injury",                                       hi: "चोट" },
  other:             { en: "Other",                                        hi: "अन्य" },

  // Health screen specific
  healthBannerTitle: { en: "Health",                                       hi: "स्वास्थ्य" },
  healthyCount:      { en: "Healthy",                                      hi: "स्वस्थ" },
  issuesCount:       { en: "Issues",                                       hi: "समस्याएं" },
  checkedCount:      { en: "Checked",                                      hi: "जांचे गए" },
  cowsChecked:       { en: "cows checked",                                 hi: "गाय जांची गईं" },
  of:                { en: "of",                                           hi: "में से" },
  tapToUpdate:       { en: "Tap a status to update",                       hi: "अपडेट करने के लिए स्थिति दबाएं" },
  select:            { en: "Select",                                       hi: "चुनें" },
  loadingCows:       { en: "Loading cows...",                              hi: "गायें लोड हो रही हैं..." },

  // Feed screen specific
  feedBannerTitle:   { en: "Feed",                                         hi: "चारा" },
  fedToday:          { en: "Fed Today",                                    hi: "आज खिलाया" },
  pendingFeed:       { en: "Pending",                                      hi: "बाकी" },
  loadingFeed:       { en: "Loading...",                                   hi: "लोड हो रहा है..." },

  // Milk screen specific
  milkBannerTitle:   { en: "Milk",                                         hi: "दूध" },
  totalMilk:         { en: "Total Milk",                                   hi: "कुल दूध" },
  cowsMilked:        { en: "Cows Milked",                                  hi: "दूध दी गई गायें" },
  loadingMilk:       { en: "Loading...",                                   hi: "लोड हो रहा है..." },

  // Tabs (scanned cow)
  tabMilk:           { en: "Milk",                                         hi: "दूध" },
  tabFeed:           { en: "Feed",                                         hi: "चारा" },
  tabHealth:         { en: "Health",                                       hi: "स्वास्थ्य" },

  // Already-done banner
  alreadyRecorded:   { en: "already recorded today — you can update below", hi: "आज पहले से दर्ज है — नीचे अपडेट करें" },

  // Status
  syncingStatus:     { en: "Syncing today's status…",                     hi: "आज की स्थिति सिंक हो रही है…" },

  // Scanner
  scanCowQR:         { en: "Scan Cow QR",                                  hi: "गाय का QR स्कैन करें" },
  pointAtTag:        { en: "Point at the cow's QR tag",                    hi: "गाय के QR टैग पर इशारा करें" },

  // Shift suffix
  shiftSuffix:       { en: "shift",                                        hi: "पाली" },

  // Feed screen UI strings
  allCowsFed:        { en: "✓ All cows fed!",                                hi: "✓ सभी गायें खिलाई गईं!" },
  cowsRemaining:     { en: "cows remaining",                                 hi: "गायें बाकी" },
  feedAllCows:       { en: "Feed All Cows",                                  hi: "सभी गायों को खिलाएं" },
  selectAllPending:  { en: "Select All Pending",                             hi: "सभी बाकी चुनें" },
  deselectAll:       { en: "Deselect All",                                   hi: "सभी हटाएं" },
  cancel:            { en: "Cancel",                                         hi: "रद्द करें" },
  yesMarkFed:        { en: "Yes, Mark Fed",                                  hi: "हाँ, खिलाया चिह्नित करें" },
  cowsBulkConfirm:   { en: "cows as fed for",                                hi: "गायों को खिलाया चिह्नित करें" },
  feedSchedule:      { en: "Feed Schedule",                                  hi: "चारा अनुसूची" },
  total:             { en: "Total",                                          hi: "कुल" },
  noTag:             { en: "No Tag",                                         hi: "टैग नहीं" },
  cowsLabel:         { en: "Cow(s)",                                         hi: "गाय" },
  feed:              { en: "Feed",                                           hi: "खिलाएं" },

  // Errors
  noMilkQty:         { en: "Error",                                        hi: "त्रुटि" },
  couldNotSave:      { en: "Could not save",                               hi: "सहेजा नहीं जा सका" },
  couldNotMark:      { en: "Could not mark fed",                           hi: "चिह्नित नहीं हो सका" },
  couldNotUnmark:    { en: "Could not unmark",                             hi: "अचिह्नित नहीं हो सका" },
};

interface LangCtx {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LangCtx>({
  lang: "en",
  toggleLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggleLang = () => setLang((l) => (l === "en" ? "hi" : "en"));
  const t = (key: string) => translations[key]?.[lang] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);