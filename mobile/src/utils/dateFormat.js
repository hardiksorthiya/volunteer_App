export const extractYMD = (value) => {
  if (!value) return '';
  const s = String(value);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s;
};

/** Display dates as mm-dd-yyyy across hour targets and related UI. */
export const formatMDY = (value) => {
  const ymd = extractYMD(value);
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const [yyyy, mm, dd] = parts;
  return `${mm}-${dd}-${yyyy}`;
};

export const toYMD = (dateObj) => {
  if (!dateObj) return null;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const oneYearAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};
