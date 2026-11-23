const normalize = (text) => String(text || "").toUpperCase().replace(/\s/g, "").replace(/[^A-Z0-9<]/g, "");
const alpha = (text) => text.replace(/0/g, "O").replace(/1/g, "I").replace(/2/g, "Z").replace(/5/g, "S").replace(/6/g, "G").replace(/8/g, "B");
const numeric = (text) => text.replace(/[OQD]/g, "0").replace(/[IL]/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/B/g, "8").replace(/G/g, "6");

function checkDigit(field) {
  return String([...field].reduce((sum, char, i) => {
    const value = char === "<" ? 0 : /[0-9]/.test(char) ? Number(char) : char.charCodeAt(0) - 55;
    return sum + value * [7, 3, 1][i % 3];
  }, 0) % 10);
}

function parseDate(text, type, now = new Date()) {
  if (!/^\d{6}$/.test(text)) return "";
  let year = 2000 + Number(text.slice(0, 2));
  if ((type === "dob" && year > now.getUTCFullYear()) || (type === "expiry" && year > now.getUTCFullYear() + 25)) year -= 100;
  const month = Number(text.slice(2, 4));
  const day = Number(text.slice(4, 6));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  if (type === "dob" && date > now) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMrzPair(first, second) {
  const line1 = alpha(normalize(first).slice(0, 44));
  let line2 = normalize(second).slice(0, 44);
  if (line1.length !== 44 || line2.length !== 44 || !/^P<[A-Z<]{3}/.test(line1)) return null;
  // Correct digit-shaped OCR letters only in numeric fields.
  line2 = line2.slice(0, 9) + numeric(line2[9]) + alpha(line2.slice(10, 13)) + numeric(line2.slice(13, 20)) + line2[20] + numeric(line2.slice(21, 28)) + line2.slice(28, 42) + numeric(line2.slice(42));
  if (!/^[A-Z<]{3}$/.test(line2.slice(10, 13)) || !/^[MFX<]$/.test(line2[20])) return null;
  if (checkDigit(line2.slice(0, 9)) !== line2[9] || checkDigit(line2.slice(13, 19)) !== line2[19] || checkDigit(line2.slice(21, 27)) !== line2[27]) return null;
  const dob = parseDate(line2.slice(13, 19), "dob");
  const expiry = parseDate(line2.slice(21, 27), "expiry");
  const passportNumber = line2.slice(0, 9).replace(/</g, "");
  const [surname = "", given = ""] = line1.slice(5).split("<<");
  const lastName = surname.replace(/</g, " ").trim();
  const givenNames = given.replace(/</g, " ").trim();
  if (!dob || !expiry || passportNumber.length < 5 || !lastName) return null;
  const issuer = line1.slice(2, 5);
  const composite = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
  const score = checkDigit(composite) === line2[43] ? 9 : 8;
  return {
    line1, line2, score,
    data: {
      firstName: givenNames, givenNames, lastName, passportNumber, passportNo: passportNumber,
      nationality: line2.slice(10, 13), passportIssuingCountry: issuer, issuingCountry: issuer,
      gender: line2[20] === "F" ? "Female" : line2[20] === "M" ? "Male" : "",
      dateOfBirth: dob, dob, passportExpiryDate: expiry, passportexp: expiry,
    },
  };
}

function findBestMrzInText(text) {
  const lines = String(text || "").split(/\r?\n/).map(normalize).filter(Boolean);
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].indexOf("P<");
    if (start < 0) continue;
    const first = lines[i].slice(start);
    const candidates = [[first, lines[i + 1] || ""]];
    if (first.length >= 88) candidates.push([first.slice(0, 44), first.slice(44, 88)]);
    for (const pair of candidates) {
      const parsed = parseMrzPair(...pair);
      if (parsed && (!best || parsed.score > best.score)) best = parsed;
    }
  }
  return best;
}

module.exports = { checkDigit, parseDate, parseMrzPair, findBestMrzInText };
