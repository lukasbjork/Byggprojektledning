/**
 * Seed-data: tre realistiska exempelprojekt så att alla vyer har innehåll
 * direkt. Datum sätts relativt dagens datum så att dashboarden alltid
 * visar ett levande läge (förseningar, kommande deadlines osv).
 *
 * Körs med: npm run db:seed  (rensar och fyller på nytt)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Datum n dagar från idag. */
function d(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
}

async function main() {
  // Rensa i FK-säker ordning (projekt-kaskaden tar det mesta)
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.automationLog.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.reportTemplate.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.project.deleteMany();

  // ===== Projekt 1: Nybyggnad flerbostadshus, mitt i produktionen =====
  const sjoviken = await prisma.project.create({
    data: {
      name: "Kv. Sjöviken – flerbostadshus",
      projectNumber: "P-2025-014",
      type: "NYBYGGNAD",
      entreprenadform: "TOTALENTREPRENAD",
      status: "PRODUKTION",
      budget: 48_500_000,
      startDate: d(-160),
      endDate: d(150),
      client: "Sjöstadens Fastighets AB",
      contractor: "NCC Building Sverige AB",
      description:
        "Nybyggnad av 42 hyreslägenheter i två huskroppar med garage under gård. Miljöbyggnad Silver.",
      milestones: {
        create: [
          { title: "Stomme klar", deadline: d(-40), status: "KLAR" },
          { title: "Tätt hus", deadline: d(18), status: "PAGAENDE" },
          { title: "Installationssamordning klar", deadline: d(45) },
          { title: "Slutbesiktning", deadline: d(140) },
        ],
      },
      risks: {
        create: [
          {
            title: "Försenad stomleverans etapp 2",
            description: "Leverantören flaggar för 2–3 veckors försening på prefabelement.",
            probability: "HOG",
            consequence: "HOG",
            status: "OPPEN",
            action: "Veckovisa avstämningar med leverantör, alternativ leverantör utredd.",
          },
          {
            title: "Brist på elektriker under semesterperioden",
            probability: "MEDEL",
            consequence: "HOG",
            status: "OPPEN",
            action: "Bemanningsplan begärd från Bravida före midsommar.",
          },
          {
            title: "Fukt i bjälklag efter gjutning",
            probability: "LAG",
            consequence: "MEDEL",
            status: "HANTERAD",
            action: "Uttorkningsplan följs upp med RBK-mätningar.",
          },
        ],
      },
      requiredDocuments: {
        create: [
          { name: "Bygglov", category: "MYNDIGHET", fulfilled: true },
          { name: "Startbesked", category: "MYNDIGHET", fulfilled: true },
          { name: "Arbetsmiljöplan", category: "AVTAL", fulfilled: true },
          { name: "Kontrollplan", category: "MYNDIGHET", fulfilled: true },
          { name: "Entreprenadavtal ABT 06", category: "AVTAL", fulfilled: true },
          { name: "Färdigställandeförsäkring", category: "AVTAL", fulfilled: false },
        ],
      },
    },
  });

  const sjovikenBudget = await prisma.budgetItem.createManyAndReturn({
    data: [
      { projectId: sjoviken.id, account: "01 Markarbeten", budgeted: 6_200_000 },
      { projectId: sjoviken.id, account: "02 Stomme", budgeted: 14_800_000 },
      { projectId: sjoviken.id, account: "03 Stomkomplettering", budgeted: 7_500_000 },
      { projectId: sjoviken.id, account: "04 Installationer el", budgeted: 4_600_000 },
      { projectId: sjoviken.id, account: "05 Installationer VVS", budgeted: 5_800_000 },
      { projectId: sjoviken.id, account: "06 Ytskikt och inredning", budgeted: 6_100_000 },
    ],
  });
  const konto = (account: string) =>
    sjovikenBudget.find((b) => b.account.startsWith(account))?.id;

  await prisma.invoice.createMany({
    data: [
      { projectId: sjoviken.id, budgetItemId: konto("01"), supplier: "Mark & Schakt Stockholm AB", amount: 3_100_000, invoiceDate: d(-95), status: "BETALD" },
      { projectId: sjoviken.id, budgetItemId: konto("01"), supplier: "Mark & Schakt Stockholm AB", amount: 1_900_000, invoiceDate: d(-60), status: "BETALD" },
      { projectId: sjoviken.id, budgetItemId: konto("02"), supplier: "NCC Building Sverige AB", amount: 4_200_000, invoiceDate: d(-58), status: "BETALD" },
      { projectId: sjoviken.id, budgetItemId: konto("02"), supplier: "NCC Building Sverige AB", amount: 3_900_000, invoiceDate: d(-30), status: "BETALD" },
      { projectId: sjoviken.id, budgetItemId: konto("02"), supplier: "NCC Building Sverige AB", amount: 2_800_000, invoiceDate: d(-12), status: "ATTESTERAD" },
      { projectId: sjoviken.id, budgetItemId: konto("04"), supplier: "Bravida Sverige AB", amount: 850_000, invoiceDate: d(-10), status: "ATTESTERAD" },
      { projectId: sjoviken.id, budgetItemId: konto("05"), supplier: "Assemblin VS AB", amount: 920_000, invoiceDate: d(-4), status: "ATT_GRANSKA" },
      { projectId: sjoviken.id, budgetItemId: konto("02"), supplier: "NCC Building Sverige AB", amount: 3_400_000, invoiceDate: d(-2), status: "ATT_GRANSKA" },
      { projectId: sjoviken.id, supplier: "Cramo AB – etablering", amount: 210_000, invoiceDate: d(-20), status: "BETALD" },
      { projectId: sjoviken.id, supplier: "Ställningsmontage Sthlm AB", amount: 180_000, invoiceDate: d(-15), status: "BESTRIDEN", note: "Fakturerad mängd stämmer inte med dagbok." },
    ],
  });

  await prisma.changeOrder.createMany({
    data: [
      { projectId: sjoviken.id, number: 1, title: "Förstärkning av grundplatta hus B", status: "GODKAND", amount: 450_000, date: d(-70), description: "Sämre mark än geoteknisk undersökning visade." },
      { projectId: sjoviken.id, number: 2, title: "Ändrad planlösning trapphus B", status: "PRISSATT", amount: 280_000, date: d(-25) },
      { projectId: sjoviken.id, number: 3, title: "Tillkommande radonmembran", status: "ANMALD", amount: 0, date: d(-6), note: "Avvaktar mätresultat." },
      { projectId: sjoviken.id, number: 4, title: "Extra eluttag i samtliga lägenheter", status: "FAKTURERAD", amount: 95_000, date: d(-90) },
    ],
  });

  const byggmote12 = await prisma.meeting.create({
    data: {
      projectId: sjoviken.id,
      title: "Byggmöte 12",
      type: "BYGGMOTE",
      date: d(-14),
      participants: "Lukas Björk (beställare), Anna Berg (NCC), Johan Ek (NCC), Sara Lind (Bravida)",
    },
  });
  await prisma.meeting.create({
    data: {
      projectId: sjoviken.id,
      title: "Byggmöte 13",
      type: "BYGGMOTE",
      date: d(7),
      participants: "Lukas Björk, Anna Berg (NCC), Johan Ek (NCC)",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      { projectId: sjoviken.id, meetingId: byggmote12.id, title: "Granska stomleverantörens månadsfaktura", responsible: "Lukas Björk", deadline: d(-3), status: "OPPEN" },
      { projectId: sjoviken.id, meetingId: byggmote12.id, title: "Uppdatera tidplan efter stomleverans", responsible: "Anna Berg (NCC)", deadline: d(-8), status: "FORSENAD" },
      { projectId: sjoviken.id, meetingId: byggmote12.id, title: "Boka samordningsmöte installationer", responsible: "Lukas Björk", deadline: d(2), status: "PAGAENDE" },
      { projectId: sjoviken.id, title: "Svar till beställaren om hyresgästanpassning plan 1", responsible: "Lukas Björk", deadline: d(5), status: "OPPEN" },
      { projectId: sjoviken.id, title: "Beställ slutbesiktning", responsible: "Lukas Björk", deadline: d(60), status: "OPPEN" },
      { projectId: sjoviken.id, title: "KMA-rond kvartal 2", responsible: "Johan Ek (NCC)", deadline: d(-7), status: "KLAR", completedAt: d(-7) },
    ],
  });

  // ===== Projekt 2: Ombyggnad kontor, i upphandlingsskedet =====
  const vasagatan = await prisma.project.create({
    data: {
      name: "Vasagatan 24 – ombyggnad kontor",
      projectNumber: "P-2025-021",
      type: "OMBYGGNAD",
      entreprenadform: "UTFORANDEENTREPRENAD",
      status: "UPPHANDLING",
      budget: 12_300_000,
      startDate: d(-45),
      endDate: d(210),
      client: "Vasakronan AB",
      contractor: "Upphandling pågår",
      description:
        "Hyresgästanpassning av plan 3–5, ca 2 400 kvm kontor. Ny planlösning, nya installationer och aktivitetsbaserad inredning.",
      milestones: {
        create: [
          { title: "Förfrågningsunderlag klart", deadline: d(-10), status: "KLAR" },
          { title: "Anbudsöppning", deadline: d(9) },
          { title: "Tilldelningsbeslut", deadline: d(30) },
          { title: "Byggstart", deadline: d(55) },
        ],
      },
      risks: {
        create: [
          {
            title: "Asbest i befintliga schakt",
            description: "Miljöinventeringen indikerar asbest i rörisolering.",
            probability: "HOG",
            consequence: "MEDEL",
            status: "OPPEN",
            action: "Kompletterande provtagning beställd.",
          },
          {
            title: "Få anbudsgivare ger högt pris",
            probability: "MEDEL",
            consequence: "MEDEL",
            status: "OPPEN",
          },
        ],
      },
      requiredDocuments: {
        create: [
          { name: "Miljöinventering", category: "BESIKTNING", fulfilled: true },
          { name: "Förfrågningsunderlag AF AMA", category: "AVTAL", fulfilled: true },
          { name: "Bygglov ändrad användning", category: "MYNDIGHET", fulfilled: false },
        ],
      },
    },
  });

  const vasagatanBudget = await prisma.budgetItem.createManyAndReturn({
    data: [
      { projectId: vasagatan.id, account: "01 Rivning och sanering", budgeted: 1_400_000 },
      { projectId: vasagatan.id, account: "02 Stomkomplettering", budgeted: 3_200_000 },
      { projectId: vasagatan.id, account: "03 Installationer", budgeted: 4_100_000 },
      { projectId: vasagatan.id, account: "04 Ytskikt och inredning", budgeted: 2_400_000 },
      { projectId: vasagatan.id, account: "05 Projektering och BL", budgeted: 1_200_000 },
    ],
  });
  const vKonto = (account: string) =>
    vasagatanBudget.find((b) => b.account.startsWith(account))?.id;

  await prisma.invoice.createMany({
    data: [
      { projectId: vasagatan.id, budgetItemId: vKonto("05"), supplier: "WSP Sverige AB", amount: 320_000, invoiceDate: d(-35), status: "BETALD" },
      { projectId: vasagatan.id, budgetItemId: vKonto("05"), supplier: "WSP Sverige AB", amount: 280_000, invoiceDate: d(-5), status: "ATT_GRANSKA" },
      { projectId: vasagatan.id, budgetItemId: vKonto("05"), supplier: "Tengbom Arkitekter", amount: 410_000, invoiceDate: d(-18), status: "ATTESTERAD" },
    ],
  });

  const startmote = await prisma.meeting.create({
    data: {
      projectId: vasagatan.id,
      title: "Startmöte projektering",
      type: "STARTMOTE",
      date: d(-40),
      participants: "Lukas Björk, Maria Holm (Vasakronan), Per Sandin (WSP)",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      { projectId: vasagatan.id, meetingId: startmote.id, title: "Sammanställ anbudsutvärdering", responsible: "Lukas Björk", deadline: d(12), status: "OPPEN" },
      { projectId: vasagatan.id, title: "Kontrollera försäkringsbevis från anbudsgivare", responsible: "Lukas Björk", deadline: d(6), status: "OPPEN" },
      { projectId: vasagatan.id, title: "Komplettera bygglovsansökan", responsible: "Per Sandin (WSP)", deadline: d(-1), status: "OPPEN" },
    ],
  });

  // ===== Projekt 3: ROT-stambyte, planeringsskede =====
  const eklunda = await prisma.project.create({
    data: {
      name: "Brf Eklunda – stambyte etapp 1",
      projectNumber: "P-2026-003",
      type: "ROT",
      entreprenadform: "TOTALENTREPRENAD",
      status: "PLANERING",
      budget: 8_900_000,
      startDate: d(20),
      endDate: d(290),
      client: "Brf Eklunda",
      contractor: "Ej upphandlad",
      description:
        "Stambyte och badrumsrenovering i 36 lägenheter, etapp 1 av 3. Kvarboende under produktion.",
      milestones: {
        create: [
          { title: "Beslut på föreningsstämma", deadline: d(-20), status: "KLAR" },
          { title: "Upphandling klar", deadline: d(40) },
          { title: "Etapp 1 byggstart", deadline: d(75) },
        ],
      },
      risks: {
        create: [
          {
            title: "Boendestörningar ger klagomål och förseningar",
            probability: "MEDEL",
            consequence: "MEDEL",
            status: "OPPEN",
            action: "Kommunikationsplan och visningslägenhet planeras.",
          },
        ],
      },
      requiredDocuments: {
        create: [
          { name: "Stämmoprotokoll med beslut", category: "PROTOKOLL", fulfilled: true },
          { name: "Teknisk utredning stammar", category: "BESIKTNING", fulfilled: true },
          { name: "Entreprenadavtal", category: "AVTAL", fulfilled: false },
        ],
      },
      budgetItems: {
        create: [
          { account: "01 Stambyte", budgeted: 6_800_000 },
          { account: "02 Badrumsrenovering tillval", budgeted: 1_600_000 },
          { account: "03 Projektering och kontroll", budgeted: 500_000 },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      projectId: eklunda.id,
      supplier: "Stambesiktning Sverige AB",
      amount: 145_000,
      invoiceDate: d(-50),
      status: "BETALD",
    },
  });

  await prisma.actionItem.createMany({
    data: [
      { projectId: eklunda.id, title: "Ta fram informationsmaterial till boende", responsible: "Lukas Björk", deadline: d(10), status: "PAGAENDE" },
      { projectId: eklunda.id, title: "Begär referenser från tre entreprenörer", responsible: "Lukas Björk", deadline: d(20), status: "OPPEN" },
    ],
  });

  // ===== Aktivitetslogg =====
  const activities: Array<{ projectId: string | null; message: string; daysAgo: number }> = [
    { projectId: sjoviken.id, message: "Faktura från NCC (3 400 000 kr) registrerades för granskning", daysAgo: 2 },
    { projectId: sjoviken.id, message: "ÄTA 3 ”Tillkommande radonmembran” anmäldes", daysAgo: 6 },
    { projectId: vasagatan.id, message: "Faktura från WSP (280 000 kr) registrerades för granskning", daysAgo: 5 },
    { projectId: sjoviken.id, message: "Milstolpe ”Stomme klar” markerades som klar", daysAgo: 12 },
    { projectId: vasagatan.id, message: "Milstolpe ”Förfrågningsunderlag klart” markerades som klar", daysAgo: 10 },
    { projectId: eklunda.id, message: "Projekt ”Brf Eklunda – stambyte etapp 1” skapades", daysAgo: 21 },
    { projectId: sjoviken.id, message: "Byggmöte 12 hölls", daysAgo: 14 },
    { projectId: sjoviken.id, message: "Faktura från Ställningsmontage Sthlm AB bestreds", daysAgo: 15 },
  ];
  for (const a of activities) {
    await prisma.activityLog.create({
      data: { projectId: a.projectId, message: a.message, createdAt: d(-a.daysAgo) },
    });
  }

  console.log("Seed klar: 3 projekt med möten, åtgärder, ekonomi, ÄTA och risker.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
