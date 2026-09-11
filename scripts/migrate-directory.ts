/**
 * Migrates content/legacy/pages/osi-directory.json into
 * directory_contacts + locations, plus seeds the /directory page.
 *
 * Hand-curated rather than parsed generically: the domestic staff
 * entries are uniform (Name/Role/Address/Cell/Office/Email), but the
 * international distributor entries are not — several concatenate name
 * and title with no separator ("Ali Al HabsiTechnical Manager"), mix
 * field order, or combine two fields on one line
 * ("Cell:+1-701-290-3100Office:+1-701-317-6366"). A regex parser risks
 * misattributing a real person's phone number or email; every value
 * below is transcribed directly from
 * content/legacy/pages/osi-directory.json paragraphs[] (verified
 * against that file — see docs/DECISIONS.md).
 *
 * Everything lands status='draft'. Idempotent: deletes and re-inserts
 * all rows tagged with source location/department each run.
 *
 * Usage: pnpm migrate:directory [--dry-run]
 */
import { createServiceRoleDbClient } from "../lib/db/client";

const DRY_RUN = process.argv.includes("--dry-run");

const HQ_ADDRESS = "1001 Pearl St, Odessa, TX 79761";

type ContactSeed = {
  department: string;
  name: string;
  role?: string;
  address?: string;
  phoneCell?: string;
  phoneOffice?: string;
  email?: string;
  locationKey?: string;
};

type LocationSeed = {
  key: string;
  name: string;
  kind: "hq" | "office" | "distributor";
  country: string;
  address?: string;
  phone?: string;
  email?: string;
};

const LOCATIONS: LocationSeed[] = [
  {
    key: "hq-odessa",
    name: "Odessa Separator Inc. — HQ",
    kind: "hq",
    country: "United States",
    address: `${HQ_ADDRESS} (USA)`,
    phone: "+1 (432) 580-7111",
  },
  {
    key: "us-nd",
    name: "Evolution Completions",
    kind: "distributor",
    country: "United States",
    address: "409 8th AVE.E, Williston, ND 58801",
    phone: "+1-701-317-6366",
  },
  {
    key: "us-ca",
    name: "Jameson Specialties, Inc",
    kind: "distributor",
    country: "United States",
    address: "7531 Meany Avenue, Bakersfield, CA 93308",
    phone: "+1-661-588-0894",
  },
  {
    key: "us-ok",
    name: "Harris Sales Co.",
    kind: "distributor",
    country: "United States",
    address: "2100 S I-35 Service Rd, Oklahoma City, OK 73129",
    phone: "+1-405-677-7887",
  },
  {
    key: "co-velocity",
    name: "Velocity ALS",
    kind: "distributor",
    country: "Colombia",
    address: "Calle 98 # 21 - 50 Oficina 902",
    phone: "+57 302-534-3168",
  },
  {
    key: "om-impel",
    name: "Impel Energy",
    kind: "distributor",
    country: "Oman",
    email: "solutions@impelenergy.com",
  },
  {
    key: "ca-edmonton",
    name: "Edmonton distributor (company name not captured in scrape)",
    kind: "distributor",
    country: "Canada",
    address: "7108-56 Ave NW, Edmonton AB",
    phone: "+1-877-437-7733",
  },
  {
    key: "mx-moit",
    name: "MOIT",
    kind: "distributor",
    country: "United States",
    address: "1585 W Sam Houston Pkwy N, Suite 200, Houston, TX 77043",
    phone: "+1-713-464-1832",
  },
  {
    key: "ar-duralitte",
    name: "Duralitte",
    kind: "distributor",
    country: "Argentina",
    address: "Debenedetti 3895, Olivos (CP1636), Buenos Aires",
  },
  {
    key: "eg-lufkin",
    name: "Lufkin",
    kind: "distributor",
    country: "Egypt",
    address: "14G, Ahmed Kamel St., Maadi, Cairo",
  },
  {
    key: "co-lesenergy",
    name: "LES Energy",
    kind: "distributor",
    country: "Colombia",
    address: "Street 113 #7-45 Office. 514, Teleport Tower B, Bogotá",
  },
];

const CONTACTS: ContactSeed[] = [
  // Engineer & Technical Department
  {
    department: "Engineer & Technical Department",
    name: "Luis Guanacas",
    role: "Technical Operations Manager",
    address: HQ_ADDRESS,
    phoneCell: "+1 432-924-8202",
    phoneOffice: "+1-432-580-7111",
    email: "Lguanacas@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "Engineer & Technical Department",
    name: "Gustavo Gonzalez",
    role: "Chief Executive Officer (CEO)",
    address: HQ_ADDRESS,
    phoneCell: "+1-432-257-2009",
    phoneOffice: "+1-432-580-7111",
    email: "ggonzalez@odsep.com",
    locationKey: "hq-odessa",
  },
  // US Sales
  {
    department: "US Sales",
    name: "Shivani Vyas",
    role: "Sales Manager",
    address: HQ_ADDRESS,
    phoneCell: "+1-432-208-7977",
    phoneOffice: "+1-432-580-7111",
    email: "svyas@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Neil Johnson",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1-432-307-1590",
    phoneOffice: "+1-432-580-7111",
    email: "njohnson@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Scott Vestal",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1-432-202-2711",
    phoneOffice: "+1-432-580-7111",
    email: "svestal@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "A.B. Rodriguez",
    role: "Business Development Sales",
    address: HQ_ADDRESS,
    phoneCell: "+1-432-664-5089",
    phoneOffice: "+1-432-580-7111",
    email: "abrodriguez@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Andres Baquero",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1 (432)-444-1906",
    phoneOffice: "+1-432-580-7111",
    email: "abaquero@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Donovan Sanchez",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1-432-257-6722",
    phoneOffice: "+1-432-580-7111",
    email: "donovans@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Norman Grimes",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1 (432) 703-7934",
    phoneOffice: "+1-432-580-7111",
    email: "ngrimes@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Francy Valles",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1 (432) 803-8881",
    phoneOffice: "+1-432-580-7111",
    email: "fvalles@odsep.com",
    locationKey: "hq-odessa",
  },
  {
    department: "US Sales",
    name: "Luke Bell",
    role: "Sales/Application Engineer",
    address: HQ_ADDRESS,
    phoneCell: "+1 (432)-664-5089",
    phoneOffice: "+1-432-580-7111",
    email: "lbell@odsep.com",
    locationKey: "hq-odessa",
  },
  // Field Technician
  {
    department: "Field Technician",
    name: "Juan Diaz",
    role: "Field Services Manager",
    phoneCell: "+1-432-924-7255",
    phoneOffice: "+1-432-580-7111",
    email: "jdiaz@odsep.com",
    locationKey: "hq-odessa",
  },
  // US Distributors
  {
    department: "US Distributors — North Dakota",
    name: "Will Davidson",
    role: "Vice President of Sales — Evolution Completions",
    address: "409 8th AVE.E, Williston, ND 58801",
    phoneCell: "+1-701-290-3100",
    phoneOffice: "+1-701-317-6366",
    locationKey: "us-nd",
  },
  {
    department: "US Distributors — California",
    name: "Bill Jameson",
    role: "Jameson Specialties, Inc",
    address: "7531 Meany Avenue, Bakersfield, CA 93308",
    phoneOffice: "+1-661-588-0894",
    phoneCell: "+1-661-201-1809",
    locationKey: "us-ca",
  },
  {
    department: "US Distributors — Oklahoma",
    name: "Jason Harris",
    role: "Harris Sales Co.",
    address: "2100 S I-35 Service Rd, Oklahoma City, OK 73129",
    phoneOffice: "+1-405-677-7887",
    locationKey: "us-ok",
  },
  // International Distributors
  {
    department: "International Distributors",
    name: "William Aya",
    role: "Sales & Operations Manager — Velocity ALS",
    address: "Calle 98 # 21 - 50 Oficina 902",
    phoneOffice: "+57 302-534-3168",
    email: "william.aya@velocityals.com",
    locationKey: "co-velocity",
  },
  {
    department: "International Distributors",
    name: "Ali Al Habsi",
    role: "Technical Manager — Velocity ALS",
    address: "Muscat, Oman",
  },
  {
    department: "International Distributors",
    name: "Juan Perdomo",
    role: "Project Leader — Velocity ALS",
    address: "Calle 98 # 21 - 50 Oficina 902",
    phoneOffice: "+57 312-322-4078",
    email: "juan.perdomo@velocityals.com",
    locationKey: "co-velocity",
  },
  {
    department: "International Distributors",
    name: "Impel Energy",
    role: "General contact (Oman)",
    phoneOffice: "+968 9921 6924",
    phoneCell: "+968 9233 8470",
    email: "solutions@impelenergy.com",
    locationKey: "om-impel",
  },
  {
    department: "International Distributors",
    name: "Brian Waterhouse",
    role: "Sales Manager",
    address: "7108-56 Ave NW, Edmonton AB",
    phoneCell: "+1 (780) 918-0651",
    phoneOffice: "+1 (780) 437-7733",
    locationKey: "ca-edmonton",
  },
  {
    department: "International Distributors",
    name: "Brad Metke",
    role: "Sales",
    phoneCell: "+1 (780) 983-4480",
    locationKey: "ca-edmonton",
  },
  {
    department: "International Distributors",
    name: "Douglas Tenías",
    role: "Sales Manager — MOIT",
    address: "1585 W Sam Houston Pkwy N, Suite 200, Houston, TX 77043",
    phoneOffice: "+1 (713) 464-1832",
    phoneCell: "+52-9933115631",
    email: "douglastenias@moitsp.com",
    locationKey: "mx-moit",
  },
  {
    department: "International Distributors",
    name: "Daniel Sanchez",
    role: "Commercial Manager — Duralitte",
    address: "Debenedetti 3895, Olivos (CP1636), Buenos Aires, Argentina",
    phoneOffice: "+54 9 11 4005 5540",
    phoneCell: "+54 9 11 3362 8392",
    email: "das@duralitte.com",
    locationKey: "ar-duralitte",
  },
  {
    department: "International Distributors",
    name: "Abdullah Sakr",
    role: "Sales Manager — Lufkin",
    address: "14G, Ahmed Kamel St., Laselky st., Maadi, Cairo, Egypt",
    phoneOffice: "+2 02 2516 7345",
    // Email as scraped — domain doesn't match the person's name; kept
    // verbatim rather than corrected (see file header).
    email: "amohammed@lufkin.com",
    locationKey: "eg-lufkin",
  },
  {
    department: "International Distributors",
    name: "Silvio Diazgranados D.",
    role: "Sales Manager — LES Energy",
    address: "Street 113 #7-45 Office. 514, Teleport Tower B, Bogotá, Colombia",
    phoneCell: "+57 317 232 1043",
    email: "silvio.diazgranados@lesenergy.com.co",
    locationKey: "co-lesenergy",
  },
  {
    department: "International Distributors",
    name: "Rana M. El-Saghier",
    role: "Sales Account Manager / Project Manager — Lufkin",
    address: "Building 14G, Ahmed Kamel Street, Al Lasiliki Division, Maadi, Cairo, Egypt",
    phoneOffice: "+2 02 2516 7345",
    // Same email-mismatch note as Abdullah Sakr above.
    email: "IRMohamed@lufkin.com",
    locationKey: "eg-lufkin",
  },
];

async function main() {
  if (DRY_RUN) {
    console.log(
      `[dry run] Would upsert ${LOCATIONS.length} locations and ${CONTACTS.length} directory contacts (all status=draft).`,
    );
    return;
  }

  const db = createServiceRoleDbClient();

  const locationIdByKey = new Map<string, string>();
  for (const loc of LOCATIONS) {
    const { data, error } = await db
      .from("locations")
      .upsert(
        {
          name: loc.name,
          kind: loc.kind,
          country: loc.country,
          address: loc.address,
          phone: loc.phone,
          email: loc.email,
          status: "draft",
        },
        { onConflict: "name" },
      )
      .select("id")
      .single();
    if (error) throw error;
    locationIdByKey.set(loc.key, data.id);
  }

  await db.from("directory_contacts").delete().not("id", "is", null);

  let position = 0;
  for (const contact of CONTACTS) {
    position += 10;
    const { error } = await db.from("directory_contacts").insert({
      department: contact.department,
      name: contact.name,
      role: contact.role,
      address: contact.address,
      phone_cell: contact.phoneCell,
      phone_office: contact.phoneOffice,
      email: contact.email,
      location_id: contact.locationKey ? locationIdByKey.get(contact.locationKey) : null,
      position,
      status: "draft",
    });
    if (error) throw error;
  }

  // /directory page
  const { data: pageRow, error: pageError } = await db
    .from("pages")
    .upsert(
      {
        slug: "directory",
        locale: "en",
        title: "Directory",
        template: "standard",
        seo_title: "Directory | Odessa Separator Inc",
        status: "draft",
      },
      { onConflict: "slug,locale" },
    )
    .select("id")
    .single();
  if (pageError) throw pageError;

  await db.from("page_blocks").delete().eq("page_id", pageRow.id);
  const blocks = [
    { type: "hero_page", data: { background: "navy", title: "Directory" } },
    { type: "team_directory", data: { background: "cream", title: "Directory" } },
  ];
  let blockPosition = 0;
  for (const block of blocks) {
    blockPosition += 10;
    const { error } = await db
      .from("page_blocks")
      .insert({ page_id: pageRow.id, type: block.type, position: blockPosition, data: block.data });
    if (error) throw error;
  }

  console.log(
    `Migrated ${LOCATIONS.length} locations and ${CONTACTS.length} directory contacts (status=draft), seeded /directory.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
