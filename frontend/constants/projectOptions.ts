export const SLOGANS = [
  "Durable Objects are sweet and so are you",
  "I'd love to be in sync with you",
  "My code is bad, but at least I'm shipping",
  "Collab should be orange",
  "I'm not a designer, okay?",
];

export const EMOJIS = ["🧡", "🛳️", "✨", "👨🏻‍🍳", "🦦", "💖", "💪", "🔥", "✌️", "⭐"];

export const COLORS = {
  backgrounds: [
    { name: "Light Blue", value: "#E3F2FD" },
    { name: "Mint", value: "#E0F2F1" },
    { name: "Lavender", value: "#EDE7F6" },
    { name: "Peach", value: "#FFEBEE" },
    { name: "Cream", value: "#FFF8E1" },
  ],
  foregrounds: [
    { name: "Navy", value: "#1A237E" },
    { name: "Forest", value: "#1B5E20" },
    { name: "Burgundy", value: "#880E4F" },
    { name: "Charcoal", value: "#263238" },
    { name: "Purple", value: "#4A148C" },
  ],
};

export const TEXT_SIZES = ["small", "medium", "large"];

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

export function getValidationErrors(state: {
  slogan?: string;
  emojis?: string[];
  backgroundColor?: string;
  foregroundColor?: string;
  textSize?: string;
}): string[] {
  const errors: string[] = [];

  if (state.slogan && !isValidSlogan(state.slogan)) {
    errors.push(`Invalid slogan: ${state.slogan}`);
  }

  if (state.emojis) {
    if (state.emojis.length > 3) {
      errors.push("Maximum of 3 emojis allowed");
    }

    for (const emoji of state.emojis) {
      if (!isValidEmoji(emoji)) {
        errors.push(`Invalid emoji: ${emoji}`);
      }
    }
  }

  if (state.backgroundColor && !isValidBackgroundColor(state.backgroundColor)) {
    errors.push(`Invalid background color: ${state.backgroundColor}`);
  }

  if (state.foregroundColor && !isValidForegroundColor(state.foregroundColor)) {
    errors.push(`Invalid foreground color: ${state.foregroundColor}`);
  }

  if (state.textSize && !isValidTextSize(state.textSize)) {
    errors.push(`Invalid text size: ${state.textSize}`);
  }

  return errors;
}
