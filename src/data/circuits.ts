import heroJura from "@/assets/hero-jura.jpg";
import circuitRiviera from "@/assets/circuit-riviera.jpg";
import circuitProvence from "@/assets/circuit-provence.jpg";
import circuitAlps from "@/assets/circuit-alps.jpg";

export interface CircuitStop {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  type: "viewpoint" | "restaurant" | "parking" | "site";
  duration: string;
  audioText?: string;
  audioRadius?: number;
}

export interface Circuit {
  id: string;
  title: string;
  description: string;
  region: string;
  duration: string;
  distance: string;
  difficulty: "Facile" | "Modéré" | "Difficile";
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  stops: CircuitStop[];
  route: [number, number][];
}

export const circuits: Circuit[] = [
  {
    id: "jura-mountains",
    title: "Les Montagnes du Jura",
    description: "Découvrez les routes sinueuses du Jura, entre lacs cristallins, forêts denses et villages pittoresques. Un parcours inoubliable à travers des paysages à couper le souffle.",
    region: "Jura, Bourgogne-Franche-Comté",
    duration: "4h30",
    distance: "180 km",
    difficulty: "Modéré",
    price: 9.99,
    rating: 4.8,
    reviewCount: 124,
    image: heroJura,
    stops: [
      { id: "s1", title: "Belvédère des 4 Lacs", description: "Vue panoramique sur les 4 lacs du Jura", lat: 46.625, lng: 5.875, type: "viewpoint", duration: "30 min", audioText: "Bienvenue au belvédère des quatre lacs, l'un des panoramas les plus spectaculaires du Jura.", audioRadius: 150 },
      { id: "s2", title: "Cascades du Hérisson", description: "Série de cascades magnifiques en pleine forêt", lat: 46.612, lng: 5.855, type: "site", duration: "1h", audioText: "Les cascades du Hérisson forment un ensemble de 31 sauts sur 3,7 kilomètres.", audioRadius: 200 },
      { id: "s3", title: "Lac de Bonlieu", description: "Lac naturel entouré de forêts", lat: 46.605, lng: 5.861, type: "viewpoint", duration: "20 min", audioText: "Ceci est le lac de Bonlieu, un magnifique lac naturel formé il y a des milliers d'années.", audioRadius: 100 },
      { id: "s4", title: "Restaurant Le Bon Accueil", description: "Cuisine locale et spécialités comtoises", lat: 46.630, lng: 5.890, type: "restaurant", duration: "1h30" },
    ],
    route: [[46.640, 5.870], [46.635, 5.872], [46.630, 5.878], [46.625, 5.875], [46.620, 5.868], [46.615, 5.860], [46.612, 5.855], [46.608, 5.858], [46.605, 5.861]],
  },
  {
    id: "cote-azur",
    title: "La Côte d'Azur en Décapotable",
    description: "Longez la Méditerranée sur les routes les plus glamour de France. De Nice à Saint-Tropez, vivez le rêve azuréen.",
    region: "Provence-Alpes-Côte d'Azur",
    duration: "3h",
    distance: "120 km",
    difficulty: "Facile",
    price: 12.99,
    rating: 4.9,
    reviewCount: 256,
    image: circuitRiviera,
    stops: [
      { id: "s1", title: "Promenade des Anglais", description: "L'emblématique promenade de Nice", lat: 43.695, lng: 7.265, type: "viewpoint", duration: "30 min" },
      { id: "s2", title: "Cap Ferrat", description: "Presqu'île de rêve entre Nice et Monaco", lat: 43.689, lng: 7.328, type: "site", duration: "45 min" },
    ],
    route: [[43.695, 7.265], [43.690, 7.290], [43.689, 7.328]],
  },
  {
    id: "provence-lavande",
    title: "Route de la Lavande",
    description: "Traversez les champs de lavande en Provence, entre villages perchés et marchés colorés. Un voyage sensoriel unique.",
    region: "Provence",
    duration: "5h",
    distance: "200 km",
    difficulty: "Facile",
    price: 8.99,
    rating: 4.7,
    reviewCount: 89,
    image: circuitProvence,
    stops: [
      { id: "s1", title: "Plateau de Valensole", description: "Les plus beaux champs de lavande", lat: 43.837, lng: 5.983, type: "viewpoint", duration: "45 min" },
      { id: "s2", title: "Gorges du Verdon", description: "Le Grand Canyon de l'Europe", lat: 43.753, lng: 6.325, type: "site", duration: "1h30" },
    ],
    route: [[43.837, 5.983], [43.800, 6.100], [43.753, 6.325]],
  },
  {
    id: "alpes-grands-cols",
    title: "Les Grands Cols des Alpes",
    description: "Attaquez les plus hauts cols routiers d'Europe. Lacets vertigineux, panoramas alpins et sensations fortes garanties.",
    region: "Alpes françaises",
    duration: "6h",
    distance: "250 km",
    difficulty: "Difficile",
    price: 14.99,
    rating: 4.9,
    reviewCount: 178,
    image: circuitAlps,
    stops: [
      { id: "s1", title: "Col du Galibier", description: "2 642 m d'altitude, vue à 360°", lat: 45.064, lng: 6.408, type: "viewpoint", duration: "30 min" },
      { id: "s2", title: "Col de l'Iseran", description: "Plus haut col routier des Alpes", lat: 45.417, lng: 7.031, type: "viewpoint", duration: "30 min" },
    ],
    route: [[45.064, 6.408], [45.200, 6.600], [45.417, 7.031]],
  },
];

export const regions = [
  { name: "Jura", count: 1 },
  { name: "Côte d'Azur", count: 1 },
  { name: "Provence", count: 1 },
  { name: "Alpes", count: 1 },
  { name: "Bretagne", count: 0 },
  { name: "Alsace", count: 0 },
];
