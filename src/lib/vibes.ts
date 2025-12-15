export interface VibeCategory {
  name: string;
  vibes: string[];
}

export const vibeCategories: VibeCategory[] = [
  {
    name: "Tone & Mood",
    vibes: [
      "Tragic",
      "Comedic",
      "Dramatic",
      "Poetic / Lyrical",
      "Hopeful / Inspirational",
      "Melancholic",
      "Suspenseful",
      "Whimsical / Lighthearted",
      "Dark / Grim / Gritty",
      "Philosophical / Reflective",
      "Bittersweet",
      "Satirical / Ironic",
    ],
  },
  {
    name: "Genre",
    vibes: [
      "Fantasy (High Fantasy, Low Fantasy, Urban Fantasy)",
      "Science Fiction (Cyberpunk, Space Opera, Dystopian, Hard Sci-Fi)",
      "Mystery / Detective",
      "Horror (Gothic, Psychological, Supernatural, Body Horror)",
      "Adventure / Action",
      "Romance (Sweet, Dark, Forbidden, Contemporary, Historical Romance)",
      "Thriller (Political, Espionage, Techno-thriller)",
      "Western (Classic, Weird West, Neo-Western)",
    ],
  },
  {
    name: "Aesthetic",
    vibes: [
      "Surreal / Dreamlike",
      "Mythical / Legendary",
      "Futuristic / High-Tech",
      "Steampunk",
      "Dieselpunk",
      "Cyber-fantasy",
      "Magical Realism",
      "Folkloric / Fairytale",
      "Post-Apocalyptic",
      "Utopian / Idealistic",
      "Noir / Neo-Noir",
      "Slice-of-Life (Everyday, Character-driven)",
      "Campy / Over-the-top",
      "Heroic / Noblebright",
      "Grimdark",
      "Coming-of-Age",
      "Mythpunk / Fairytale Subversion",
      "Historical Fiction (Ancient, Medieval, Renaissance, Industrial Era)",
    ],
  },
  {
    name: "Scope / Scale",
    vibes: [
      "Epic (Grand Scale, Sweeping Conflicts)",
      "Intimate (Small Scale, Personal Stories)",
      "Multi-POV (Interwoven Perspectives)",
    ],
  },
];

export const allVibes = vibeCategories.flatMap((cat) => cat.vibes);
