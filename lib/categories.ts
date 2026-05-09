export interface Category {
  slug: string;
  label_es: string;
  aliases: string[];
}

export const CATEGORIES: Category[] = [
  { slug: "restaurant",     label_es: "Restaurante",                 aliases: ["restaurante","restaurant","restaurantes","restaurante de comida","parrilla","parrillada","asador"] },
  { slug: "bar",            label_es: "Bar / Pub",                   aliases: ["bar","bares","pub","cervecería","cerveceria","bar de tapas","bar nocturno"] },
  { slug: "cafe",           label_es: "Café / Cafetería",            aliases: ["café","cafe","cafetería","cafeteria","coffee shop","café bar","cafe bar"] },
  { slug: "bakery",         label_es: "Panadería / Confitería",      aliases: ["panadería","panaderia","panadería artesanal","confitería","confiteria","pastelería","pasteleria"] },
  { slug: "supermarket",    label_es: "Supermercado / Almacén",      aliases: ["supermercado","almacén","almacen","autoservicio","minimarket","verdulería","verduleria","dietética","dietetica"] },
  { slug: "pharmacy",       label_es: "Farmacia",                    aliases: ["farmacia","droguería","drogueria","farmacia y perfumería","farmacia de turno"] },
  { slug: "hospital",       label_es: "Hospital / Clínica",          aliases: ["hospital","clínica","clinica","sanatorio","policlínico","policlinico","centro médico","centro medico","centro de salud"] },
  { slug: "gym",            label_es: "Gimnasio / Fitness",          aliases: ["gimnasio","gym","fitness","crossfit","box de crossfit","musculación","musculacion"] },
  { slug: "beauty_salon",   label_es: "Estética / Spa",              aliases: ["salón de belleza","salon de belleza","estética","estetica","spa","centro estético","centro estetico","peluquería femenina","peluqueria femenina"] },
  { slug: "hair_salon",     label_es: "Peluquería / Barbería",       aliases: ["peluquería","peluqueria","barbería","barberia","barber shop","corte de cabello"] },
  { slug: "car_repair",     label_es: "Taller mecánico",             aliases: ["taller mecánico","taller mecanico","taller automotor","mecánico","mecanico","mecánica del automotor","mecanica del automotor","taller de autos","gomería","gomeria","electricidad del automotor"] },
  { slug: "car_dealer",     label_es: "Concesionaria de autos",      aliases: ["concesionaria","concesionario","agencia de autos","venta de autos","agencia de vehículos","agencia de vehiculos"] },
  { slug: "hotel",          label_es: "Hotel / Alojamiento",         aliases: ["hotel","motel","apart hotel","apart-hotel","alojamiento","posada","hostería","hosteria","hostel","residencial"] },
  { slug: "real_estate",    label_es: "Inmobiliaria",                aliases: ["inmobiliaria","inmobiliario","agencia inmobiliaria","bienes raíces","bienes raices"] },
  { slug: "dentist",        label_es: "Odontología",                 aliases: ["odontología","odontologia","odontólogo","odontologo","clínica dental","clinica dental","consultorio odontológico","consultorio odontologico","dentista"] },
  { slug: "doctor",         label_es: "Médico / Consultorio",        aliases: ["médico","medico","consultorio médico","consultorio","médico general","medico general","clínica médica","clinica medica"] },
  { slug: "veterinarian",   label_es: "Veterinaria",                 aliases: ["veterinaria","veterinario","clínica veterinaria","clinica veterinaria","pet shop","veterinaria y pet shop"] },
  { slug: "school",         label_es: "Escuela / Instituto",         aliases: ["escuela","colegio","instituto educativo","instituto","jardín de infantes","jardin de infantes","jardín maternal","jardin maternal","centro educativo"] },
  { slug: "clothing_store", label_es: "Tienda de ropa",              aliases: ["tienda de ropa","ropa","indumentaria","boutique","moda","local de ropa"] },
  { slug: "electronics",    label_es: "Electrónica / Tecnología",    aliases: ["electrónica","electronica","tecnología","tecnologia","computadoras","celulares","telefonía","telefonia"] },
  { slug: "hardware_store", label_es: "Ferretería / Corralón",       aliases: ["ferretería","ferreteria","corralón","corralon","materiales de construcción","materiales de construccion","pinturería","pintureria"] },
  { slug: "travel_agency",  label_es: "Agencia de viajes",           aliases: ["agencia de viajes","turismo","tour operador","agencia de turismo"] },
  { slug: "bank",           label_es: "Banco / Finanzas",            aliases: ["banco","entidad bancaria","caja de crédito","caja de credito","financiera","casa de cambio"] },
  { slug: "gas_station",    label_es: "Estación de servicio",        aliases: ["estación de servicio","estacion de servicio","gasolinera","ypf","shell","axion","puma","estación ypf","estacion ypf"] },
  { slug: "florist",        label_es: "Florería",                    aliases: ["florería","floreria","flores","floricultura","jardín","vivero"] },
  { slug: "yoga",           label_es: "Yoga / Pilates",              aliases: ["yoga","pilates","centro de yoga","estudio de pilates","studio de yoga"] },
  { slug: "lawyer",         label_es: "Estudio jurídico",            aliases: ["estudio jurídico","estudio juridico","abogado","abogados","asesoría legal","asesoria legal","escribanía","escribania"] },
  { slug: "accountant",     label_es: "Contador / Estudio contable", aliases: ["contador","estudio contable","asesoría impositiva","asesoria impositiva","contaduría","contaduria","asesor impositivo"] },
  { slug: "photography",    label_es: "Fotografía / Estudio",        aliases: ["fotografía","fotografia","fotógrafo","fotografo","estudio fotográfico","estudio fotografico"] },
  { slug: "construction",   label_es: "Construcción / Reformas",     aliases: ["construcción","construccion","reformas","empresa constructora","albañilería","albanileria","arquitectura"] },
  { slug: "marketing_agency", label_es: "Agencia de marketing / Publicidad",    aliases: ["agencia de marketing","agencia de marketing digital","marketing digital","publicidad","agencia de publicidad","branding","agencia de branding","consultora de marketing","consultoría de marketing","consultoria de marketing","agencia de comunicación","agencia de comunicacion","comunicación publicitaria","comunicacion publicitaria","marketing y publicidad","agencia creativa","marketing","estrategia de marketing","agencia btl","agencia atl","agencia 360","media agency","publicidad y marketing","comunicación y marketing","comunicacion y marketing","agencia de medios","performance marketing","growth marketing","inbound marketing","marketing de contenidos","community management","gestión de redes sociales","gestion de redes sociales","social media","agencia de redes sociales","seo","sem","posicionamiento web","agencia seo","agencia sem"] },
  { slug: "design_agency",    label_es: "Agencia de diseño / Estudio creativo",  aliases: ["agencia de diseño","agencia de diseno","diseño gráfico","diseno grafico","agencia de diseño gráfico","agencia de diseno grafico","estudio de diseño","estudio de diseno","estudio creativo","diseño web","diseno web","diseño ux","diseno ux","diseño ui","diseno ui","diseño ux/ui","diseño publicitario","diseno publicitario","diseño editorial","diseno editorial","diseño y comunicación","diseno y comunicacion","agencia de diseño y comunicación","diseño digital","diseno digital","identidad visual","identidad corporativa","diseño de marca","diseno de marca","branding y diseño","diseño de logo","diseno de logo","diseño de packaging","packaging","motion graphics","ilustración","ilustracion","diseño de interiores","diseno de interiores","interiorismo","arquitectura de interiores","decoración","decoracion","decoración de interiores"] },
  { slug: "web_development",  label_es: "Desarrollo web / Software",             aliases: ["desarrollo web","agencia de desarrollo web","software","desarrollo de software","programación","programacion","agencia de software","empresa de software","tecnología","tecnologia","startup tecnológica","startup tecnologica","startup de tecnología","startup de tecnologia","app development","desarrollo de apps","desarrollo mobile","apps móviles","apps moviles","e-commerce","ecommerce","tienda online","soluciones digitales","transformación digital","transformacion digital","consultoría it","consultoria it","it","sistemas","empresa de sistemas","desarrollo a medida"] },
  { slug: "other",            label_es: "Otro",                                  aliases: [] },
];

const _aliasMap = new Map<string, string>();
for (const cat of CATEGORIES) {
  if (cat.slug === "other") continue;
  for (const alias of cat.aliases) {
    _aliasMap.set(alias, cat.slug);
  }
}

export function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();

  // Exact alias match
  const exact = _aliasMap.get(normalized);
  if (exact) return exact;

  // Partial match: alias contained in raw, or raw contained in alias
  for (const [alias, slug] of _aliasMap) {
    if (normalized.includes(alias) || alias.includes(normalized)) return slug;
  }

  return null;
}

export function getCategoryLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  return CATEGORIES.find((c) => c.slug === slug)?.label_es ?? slug;
}

// True if any of the raw category strings (Google's categoryName + categories[])
// normalizes to the target slug. Used to drop irrelevant places that Google
// Maps mixes into search results (e.g. supermarkets when searching restaurants).
export function categoryMatchesSlug(
  rawCategories: (string | null | undefined)[],
  targetSlug: string,
): boolean {
  for (const raw of rawCategories) {
    if (!raw) continue;
    if (normalizeCategory(raw) === targetSlug) return true;
  }
  return false;
}

// Apify categoryFilterWords must be values from its own predefined list (English only).
// Each slug maps to the subset of Apify-allowed values that best represents it.
// Slugs with no reliable Apify equivalent are omitted — filter is skipped for them.
const APIFY_FILTER_WORDS: Record<string, string[]> = {
  restaurant:       ["restaurant"],
  bar:              ["bar", "pub", "gastropub", "brewpub"],
  cafe:             ["cafe", "bistro"],
  bakery:           ["bakery", "patisserie"],
  supermarket:      ["supermarket", "hypermarket"],
  pharmacy:         ["pharmacy", "parapharmacy"],
  hospital:         ["hospital", "clinic"],
  gym:              ["gym", "sports"],
  beauty_salon:     ["beauty parlour", "beauty salon", "spa"],
  hair_salon:       ["hairdresser", "barber shop"],
  car_repair:       ["mechanic"],
  car_dealer:       ["cars"],
  hotel:            ["hotel", "motel", "hostel", "lodge"],
  dentist:          ["dentist"],
  doctor:           ["doctor"],
  veterinarian:     ["veterinarian"],
  school:           ["school", "college"],
  electronics:      ["electronics"],
  bank:             ["bank"],
  florist:          ["florist"],
  lawyer:           ["lawyer"],
  accountant:       ["accountant"],
  photography:      ["photographer"],
  construction:     ["construction"],
  marketing_agency: ["advertising agency", "advertising service"],
  design_agency:    ["design"],
  travel_agency:    ["travel"],
};

// Returns Apify-approved English filter words for the category the user's input
// maps to, or null if no mapping exists (filter is skipped in that case).
export function getApifyFilterWords(
  raw: string | null | undefined,
): string[] | null {
  const slug = normalizeCategory(raw);
  if (!slug) return null;
  return APIFY_FILTER_WORDS[slug] ?? null;
}
