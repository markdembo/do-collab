// The same constants as in frontend/constants/projectOptions.ts
export const SLOGANS = [
	'Durable Objects are sweet and so are you',
	"I'd love to be in sync with you",
	"My code is bad, but at least I'm shipping",
	'Collab should be orange',
	"I'm not a designer, okay?",
];

export const EMOJIS = ['🧡', '🛳️', '✨', '👨🏻‍🍳', '🦦', '💖', '💪', '🔥', '✌️', '⭐'];

export const COLORS = {
	backgrounds: [
		{ name: 'Light Blue', value: '#E3F2FD' },
		{ name: 'Mint', value: '#E0F2F1' },
		{ name: 'Lavender', value: '#EDE7F6' },
		{ name: 'Peach', value: '#FFEBEE' },
		{ name: 'Cream', value: '#FFF8E1' },
	],
	foregrounds: [
		{ name: 'Navy', value: '#1A237E' },
		{ name: 'Forest', value: '#1B5E20' },
		{ name: 'Burgundy', value: '#880E4F' },
		{ name: 'Charcoal', value: '#263238' },
		{ name: 'Purple', value: '#4A148C' },
	],
};

export const TEXT_SIZES = ['small', 'medium', 'large'];

// Helper functions for validation
export function isValidSlogan(slogan: string): boolean {
	return SLOGANS.includes(slogan);
}

export function isValidEmoji(emoji: string): boolean {
	return EMOJIS.includes(emoji);
}

export function isValidBackgroundColor(color: string): boolean {
	return COLORS.backgrounds.some((bg) => bg.value === color);
}

export function isValidForegroundColor(color: string): boolean {
	return COLORS.foregrounds.some((fg) => fg.value === color);
}

export function isValidTextSize(size: string): boolean {
	return TEXT_SIZES.includes(size);
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export interface ProjectStateUpdate {
	slogan?: string;
	emojis?: string[];
	backgroundColor?: string;
	foregroundColor?: string;
	textSize?: string;
	[key: string]: any; // Allow other fields for type compatibility
}

export function validateProjectStateUpdate(update: ProjectStateUpdate): ValidationResult {
	const errors: string[] = [];

	if (update.slogan !== undefined && !isValidSlogan(update.slogan)) {
		errors.push(`Invalid slogan: ${update.slogan}`);
	}

	if (update.emojis !== undefined) {
		if (update.emojis.length > 3) {
			errors.push('Maximum of 3 emojis allowed');
		}

		for (const emoji of update.emojis) {
			if (!isValidEmoji(emoji)) {
				errors.push(`Invalid emoji: ${emoji}`);
			}
		}
	}

	if (update.backgroundColor !== undefined && !isValidBackgroundColor(update.backgroundColor)) {
		errors.push(`Invalid background color: ${update.backgroundColor}`);
	}

	if (update.foregroundColor !== undefined && !isValidForegroundColor(update.foregroundColor)) {
		errors.push(`Invalid foreground color: ${update.foregroundColor}`);
	}

	if (update.textSize !== undefined && !isValidTextSize(update.textSize)) {
		errors.push(`Invalid text size: ${update.textSize}`);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
