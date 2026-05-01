// 🆕 ฟังก์ชันสำหรับจัดรูปแบบวันที่ภาษาไทย
export const formatThaiDate = (dateString?: string) => {
  if (!dateString || dateString === "-") return "-";
  try {
    // ตัดเอาเฉพาะส่วนวันที่ (YYYY-MM-DD)
    const datePart = dateString.split('T')[0];
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    
    let year = parseInt(yearStr, 10);
    // ถ้าปีน้อยกว่า 2400 (แปลว่าเป็น ค.ศ.) ให้บวก 543 เป็น พ.ศ.
    if (year < 2400) year += 543;
    
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthName = thaiMonths[parseInt(monthStr, 10) - 1];
    
    return `${parseInt(dayStr, 10)} ${monthName} ${year}`;
  } catch (e) {
    return dateString; // ถ้าแปลงพัง ให้แสดงผลเดิม
  }
};