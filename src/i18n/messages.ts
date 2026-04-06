export type Locale = 'en' | 'th'

export type Messages = {
  navFlow: string
  navConfig: string
  navAriaLabel: string
  primaryActionReset: string
  primaryActionPause: string
  primaryActionResume: string
  primaryActionStart: string
  secondaryReset: string
  timeRemaining: string
  configTitle: string
  configDescription: string
  configSessionWarning: string
  numberOfSticks: string
  adjustQuantity: string
  decreaseSticksAria: string
  increaseSticksAria: string
  burningDuration: string
  durationMinutes: (n: number) => string
  sliderAriaLabel: string
  durationTick1: string
  durationTick15: string
  durationTick30: string
  resetToDefault: string
  languageLabel: string
  languageEnglish: string
  languageThai: string
}

const en: Messages = {
  navFlow: 'Flow',
  navConfig: 'Config',
  navAriaLabel: 'Primary navigation',
  primaryActionReset: 'Reset',
  primaryActionPause: 'Pause',
  primaryActionResume: 'Resume',
  primaryActionStart: 'Start',
  secondaryReset: 'Reset',
  timeRemaining: 'TIME REMAINING',
  configTitle: 'TIMER SETTINGS',
  configDescription:
    'Customize your digital incense session. Changes save automatically.',
  configSessionWarning:
    'Changing sticks or duration stops the timer and resets this session.',
  numberOfSticks: 'NUMBER OF STICKS',
  adjustQuantity: 'Adjust Quantity',
  decreaseSticksAria: 'Decrease sticks',
  increaseSticksAria: 'Increase sticks',
  burningDuration: 'BURNING DURATION',
  durationMinutes: (n) => `${n} mins`,
  sliderAriaLabel: 'Burning duration in minutes',
  durationTick1: '1M',
  durationTick15: '15M',
  durationTick30: '30M',
  resetToDefault: 'Reset to Default',
  languageLabel: 'LANGUAGE',
  languageEnglish: 'English',
  languageThai: 'ไทย',
}

const th: Messages = {
  navFlow: 'จับเวลา',
  navConfig: 'ตั้งค่า',
  navAriaLabel: 'เมนูหลัก',
  primaryActionReset: 'เริ่มใหม่',
  primaryActionPause: 'หยุดชั่วคราว',
  primaryActionResume: 'ทำต่อ',
  primaryActionStart: 'เริ่ม',
  secondaryReset: 'รีเซ็ต',
  timeRemaining: 'เวลาที่เหลือ',
  configTitle: 'ตั้งค่าตัวจับเวลา',
  configDescription:
    'ปรับแต่งเซสชันธูปดิจิทัลของคุณ การเปลี่ยนแปลงจะถูกบันทึกอัตโนมัติ',
  configSessionWarning:
    'การเปลี่ยนจำนวนธูปหรือระยะเวลาจะหยุดตัวจับเวลาและรีเซ็ตเซสชันนี้',
  numberOfSticks: 'จำนวนธูป',
  adjustQuantity: 'ปรับจำนวน',
  decreaseSticksAria: 'ลดจำนวนธูป',
  increaseSticksAria: 'เพิ่มจำนวนธูป',
  burningDuration: 'ระยะเวลาเผา',
  durationMinutes: (n) => `${n} นาที`,
  sliderAriaLabel: 'ระยะเวลาเผาเป็นหน่วยนาที',
  durationTick1: '1น',
  durationTick15: '15น',
  durationTick30: '30น',
  resetToDefault: 'คืนค่าเริ่มต้น',
  languageLabel: 'ภาษา',
  languageEnglish: 'English',
  languageThai: 'ไทย',
}

export const messages: Record<Locale, Messages> = { en, th }

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.en
}
