export type Plan = {
  title: string;
  price: number;
  unit: "/Mois" | "/3 mois" | "/6 mois" | "/An";
  highlight?: boolean;
};

export type Discipline = {
  slug: string;
  title: string;
  plans: Plan[];
  fees?: {
    insurance: number;
    card: number;
  };
};

export const DISCIPLINES: Discipline[] = [
  {
    slug: "boxe-anglaise",
    title: "Boxe Anglaise",
    plans: [
      { title: "Boxe Anglaise - Mensuel", price: 50, unit: "/Mois", highlight: true },
      { title: "Boxe Anglaise - Trimestriel", price: 140, unit: "/3 mois" },
      { title: "Boxe Anglaise - Semestriel", price: 270, unit: "/6 mois" },
      { title: "Boxe Anglaise - Annuel", price: 500, unit: "/An" },
    ],
    fees: { insurance: 40, card: 20 },
  },
  {
    slug: "boxe-thai",
    title: "Boxe Thaïlandaise",
    plans: [
      { title: "Boxe Thaïlandaise - Mensuel", price: 50, unit: "/Mois", highlight: true },
      { title: "Boxe Thaïlandaise - Trimestriel", price: 140, unit: "/3 mois" },
      { title: "Boxe Thaïlandaise - Semestriel", price: 270, unit: "/6 mois" },
      { title: "Boxe Thaïlandaise - Annuel", price: 500, unit: "/An" },
    ],
    fees: { insurance: 40, card: 20 },
  },
  {
    slug: "mma",
    title: "MMA",
    plans: [
      { title: "MMA - Mensuel", price: 50, unit: "/Mois", highlight: true },
      { title: "MMA - Trimestriel", price: 140, unit: "/3 mois" },
      { title: "MMA - Semestriel", price: 270, unit: "/6 mois" },
      { title: "MMA - Annuel", price: 500, unit: "/An" },
    ],
    fees: { insurance: 40, card: 20 },
  },
  {
    slug: "bjj",
    title: "Jiu-Jitsu Brésilien Adultes",
    plans: [
      { title: "Jiu-Jitsu Brésilien Adultes - Mensuel", price: 55, unit: "/Mois", highlight: true },
      { title: "Jiu-Jitsu Brésilien Adultes - Trimestriel", price: 155, unit: "/3 mois" },
      { title: "Jiu-Jitsu Brésilien Adultes - Semestriel", price: 300, unit: "/6 mois" },
      { title: "Jiu-Jitsu Brésilien Adultes - Annuel", price: 605, unit: "/An" },
    ],
    fees: { insurance: 40, card: 20 },
  },
  {
    slug: "femmes-muay-thai",
    title: "Boxe Thaïlandaise - LADIES ONLY",
    plans: [
      { title: "Boxe Thaïlandaise - LADIES ONLY - Mensuel", price: 45, unit: "/Mois", highlight: true },
      { title: "Boxe Thaïlandaise - LADIES ONLY - Trimestriel", price: 125, unit: "/3 mois" },
      { title: "Boxe Thaïlandaise - LADIES ONLY - Semestriel", price: 240, unit: "/6 mois" },
      { title: "Boxe Thaïlandaise - LADIES ONLY - Annuel", price: 450, unit: "/An" },
    ],
    fees: { insurance: 40, card: 20 },
  },
  {
    slug: "femmes-bjj",
    title: "Jiu-Jitsu Brésilien - LADIES ONLY",
    plans: [
      { title: "Jiu-Jitsu Brésilien - LADIES ONLY - Mensuel", price: 45, unit: "/Mois", highlight: true },
      { title: "Jiu-Jitsu Brésilien - LADIES ONLY - Trimestriel", price: 125, unit: "/3 mois" },
      { title: "Jiu-Jitsu Brésilien - LADIES ONLY - Semestriel", price: 240, unit: "/6 mois" },
      { title: "Jiu-Jitsu Brésilien - LADIES ONLY - Annuel", price: 450, unit: "/An" },
    ],
    fees: { insurance: 40, card: 20 },
  },
  {
    slug: "kids",
    title: "Jiu-Jitsu Brésilien / Kick-Boxing - ENFANTS",
    plans: [
      { title: "Jiu-Jitsu Brésilien / Kick-Boxing - ENFANTS - Annuel", price: 400, unit: "/An", highlight: true }
    ],
    fees: { insurance: 40, card: 20 },
  },
];
