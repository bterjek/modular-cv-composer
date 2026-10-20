/** Shared by PDF reading-order recovery and the reviewed text parser. */
/** @type {Array<[import('../src/lib/domain/modules').Module, RegExp]>} */
export const headings = [
 ['summary', /^(?:professional |executive |career )?(?:summary|profile|objective|about me|összefoglaló|bemutatkozás)$/i],
 ['experience', /^(?:(?:professional|work|career|employment|relevant|additional) )?(?:experience|history)$|^(?:szakmai tapasztalat|munkatapasztalat)$/i],
 ['education', /^(?:education(?: and qualifications)?|academic background|tanulmányok|végzettség)$/i],
 ['credentials', /^(?:certifications?|certificates?|credentials|training|courses|certifications? (?:&|and) (?:training|courses)|képesítések|tanúsítványok)$/i],
 ['skills', /^(?:(?:core|key|technical|professional) )?(?:skills|competenc(?:ies|es)|expertise)$|^(?:készségek|kompetenciák)$/i],
 ['languages', /^(?:languages?|language skills|nyelvtudás|nyelvek)$/i],
 ['projects', /^(?:selected |key )?projects$/i],
 ['headline', /^headline$/i]
];
/** @param {string} text */
export const headingOf = text => headings.find(([,re])=>re.test(text.trim().replace(/:$/,'')))?.[0];
