const NO_DECOMPOSITION: Record<string, string> = { Ł: 'L', ł: 'l', Ø: 'O', ø: 'o', ß: 'ss', Đ: 'D', đ: 'd', Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe' };

/**
 * ASCII-only file name ("Ádám Tester — CV" → "Adam Tester - CV"). A UTF-8 filename* is
 * deliberately not sent: in testing, Chromium fell back to "download" whenever it held non-ASCII.
 */
export function asciiFileName(name: string) {
	return (
		name
			.replace(/[—–]/g, '-')
			.replace(/[ŁłØøßĐđÆæŒœ]/g, (c) => NO_DECOMPOSITION[c])
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^\x20-\x7e]/g, '')
			.replace(/["\\/:*?<>|]/g, '')
			.replace(/\s+/g, ' ')
			.trim() || 'CV'
	);
}
