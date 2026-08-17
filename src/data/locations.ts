import divipola from "./divipola-municipalities.json";

export type Municipality = {
  cod_dpto: string;
  dpto: string;
  cod_mpio: string;
  nom_mpio: string;
  tipo_municipio: string;
};

export type Neighborhood = { name: string; locality: "Isla de la Paz" | "El Pailón"; commune: number };
export type RuralArea = { district: string; villages: string[] };

export const municipalities = divipola as Municipality[];

export const departments = Array.from(
  new Map(municipalities.map(({ cod_dpto, dpto }) => [cod_dpto, { code: cod_dpto, name: toTitle(dpto) }])).values(),
).sort((a, b) => a.name.localeCompare(b.name, "es"));

export function municipalitiesForDepartment(departmentCode: string) {
  return municipalities
    .filter((item) => item.cod_dpto === departmentCode)
    .map((item) => ({ code: item.cod_mpio, name: toTitle(item.nom_mpio), type: item.tipo_municipio }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export const buenaventuraNeighborhoods: Neighborhood[] = [
  ...named("Isla de la Paz", 1, ["Nayita", "San Buenaventura (Nayita)", "Pueblo Nuevo", "Máyolo", "Centenario"]),
  ...named("Isla de la Paz", 2, ["La Aurora", "El Firme", "El Firme Parte Baja", "El Capricho", "El Jorge Oriental", "El Jorge", "El Jorge Calle Montechino", "El Jorge Borrero Olano", "Santa Rosa", "Francisco de Paula Santander"]),
  ...named("Isla de la Paz", 3, ["Alfonso López Sur", "Alfonso López Norte", "Alberto Lleras Camargo"]),
  ...named("Isla de la Paz", 4, ["La Playita", "La Playita Parte Baja", "Muro Yusti", "Campo Alegre", "Piedras Cantan", "Viento Libre"]),
  ...named("Isla de la Paz", 5, ["Punta del Este", "Miramar", "La Inmaculada", "Nueva Estación La Palera", "Santa Fé", "Santa Cruz", "Pascual de Andagoya"]),
  ...named("El Pailón", 6, ["El Naval", "Miraflores", "La Comuna", "El Jardín", "El Campín", "La Cima", "El Bosque Municipal", "Puerta del Cielo", "Porvenir", "Oriente", "Isla de la Paz", "Brisas del Mar"]),
  ...named("El Pailón", 7, ["San Luis", "Kennedy", "Eucarístico", "Rockefeller", "Juan XXIII", "Municipal", "14 de Julio", "San Francisco de Asís"]),
  ...named("El Pailón", 8, ["Los Laureles", "Transformación", "Modelo", "Ciudadela Colpuertos", "María Eugenia", "Olímpico", "Bellavista", "Pampa Linda", "Cristal"]),
  ...named("El Pailón", 9, ["Doce de Abril", "Ciudadela Buenaventura", "San Buenaventura", "Margarita Hurtado", "Seis de Enero", "Doña Cecy", "Turbay Ayala", "Gamboa"]),
  ...named("El Pailón", 10, ["Bello Horizonte", "Camilo Torres", "Bolívar", "Carlos Holmes Trujillo", "La Independencia", "Urbanización Comunitaria Bahía", "La Fortaleza I", "El Progreso", "Los Álamos", "Las Américas", "Urbanización Bahía", "Junta de Vivienda Comunitaria"]),
  ...named("El Pailón", 11, ["Gran Colombiana", "Nueva Colombia", "Cristóbal Colón", "El Dorado", "El Futuro", "El Carmen", "Antonio Nariño", "Cascajal", "Los Pinos", "Panamericano"]),
  ...named("El Pailón", 12, ["El Caldas", "Alfonso López Michelsen", "Jorge Eliécer Gaitán", "Perlas del Pacífico", "Rafael Uribe Uribe", "Matía Mulumba", "El Ruiz", "El Cambio", "La Libertad", "Cabal Pombo", "Las Palmas", "Nueva Granada", "Nueva Frontera", "La Campiña", "El Triunfo", "La Dignidad", "20 de Junio", "Brisas del Pacífico", "12 de Octubre", "El Limonar", "Vista Hermosa", "La Unión", "Nuevo Amanecer", "Unión de Vivienda", "Brisas del Mar", "Puerta del Mar", "Nueva Floresta", "El Milagroso", "Nuevo Horizonte"]),
];

export const buenaventuraRuralAreas: RuralArea[] = [
  { district: "Bajo Calima", villages: ["La Ligia", "La Florencia", "Bellavista Río Calima", "La Divisa", "Comunidad Indígena Ipu Euja - Arenal", "Guamito", "Miasama", "San Luis", "Villa Estella", "Comunidad Wounaan Phoborr", "El Crucero", "Km 11", "El Guineo Km 14", "Bajo Calima", "Sabacal", "Comunidad Indígena La Mojarra", "Cabildo Indígena Yu Luuck", "La Brea", "La Florida", "Comunidad Indígena Chonara Euja"] },
  { district: "Corregimiento 2", villages: ["Gamboa", "Caucana", "Can Joaquín", "Las Brisas Km 12", "La Paz Km 27", "San Isidro", "La Trojita", "Comunidad Indígena Wounaan de Guayacán Santa Rosa", "El Ceibito", "Guadual", "Guayacán", "Colabarco"] },
  { district: "Punta Magdalena", villages: ["Resguardo Indígena Unión Agua Clara", "Comunidad Indígena Pitalito Chamapuro", "Resguardo Burujón", "Unión San Bernardo", "Comunidad Indígena Cerrito Bongo", "La Plata", "La Platica", "Cabezón", "La Muerte", "Base Naval Málaga", "Juanchaco", "Ladrilleros", "La Barra", "Puerto España", "Bocas de San Juan", "Comunidad Indígena de Jooin Jeb", "Cocalito"] },
  { district: "Punta Bazán", villages: ["La Bocana", "Piangüita", "Piedra Piedra", "Santa Delicia", "El Tigre", "Isla Cangrejo-Islalba"] },
  { district: "Punta Soldado", villages: ["Punta Soldado", "La Contra", "Bellavista", "Cocalito", "Santa Bárbara", "Machetero", "La Popa", "Papayal", "Punteño", "El Bajito", "Amames", "Bello Horizonte"] },
  { district: "Corregimiento 6", villages: ["Dupad", "Cuellar", "Cabecera Usemi", "Malaguita", "Papayo", "Cabildo del Resguardo Chachajo", "Puerto Pizario", "El Cerrito", "Comunidad Indígena El Chorro", "Cabildo Chamapuro"] },
  { district: "Alto Potedó", villages: ["Alto Potedó", "Guadualito", "Resguardo Indígena La Meseta", "Pitirri", "Potedó", "Bajo Potedó", "Campo Hermoso", "Comunidad Indígena Opua Tascon - Porvenir", "La Brigada", "Las Palmeras"] },
  { district: "Carretera Simón Bolívar", villages: ["Zacarías", "Los Lagos", "Balastrera", "Bogodó", "Calle Larga", "Sabaletas", "Guaimía", "Limones", "San Marcos", "Llano Bajo", "Tatabro", "Agua Clara", "Ladrilleros-Anchicayá", "Comunidad Indígena Jooin Durr - La Belleza"] },
  { district: "Corregimiento 9", villages: ["El Llano", "Taparal", "Humane Río", "Cuevita Machetajero", "San José de Anchicayá", "La Herradura", "Santa Bárbara", "Calle Larga (Río Anchicayá)", "Umane-Mar", "Opogodó", "El Barcito"] },
  { district: "Río Raposo", villages: ["El Tigre", "Guadualito-Joaquincito", "Calle Honda", "Leticia", "San Francisco Javier", "Cacolí", "Bocas del Tatabro", "Bajito", "Santa Ana"] },
  { district: "Río Cajambre", villages: ["Barranca", "El Pital", "El Ají", "Calle Larga", "Cacao", "Mayorquín", "Playita-Río Cajambre", "San Pablito", "Punta San Antonio", "Timba", "Punta Bonita", "Fray Juan", "El Encanto", "El Caucho", "Peña Larga", "Papayal", "La Comba"] },
  { district: "Corregimiento 12", villages: ["Boca de Brazo", "Corozal", "Silva", "El Chorro", "Guapicito", "Barco", "La Fragua", "San Isidro", "Aragón", "San Vicente", "Cajambre", "La Ventura", "Ordoñes"] },
  { district: "Río Yurumanguí", villages: ["Isla del Venado", "El Águila", "San Jerónimo", "San Miguel", "El Barranco", "Papayo", "Primavera", "San Antonio (Yurumanguí)", "El Aguacate", "El Charco", "Carmen-Veneral"] },
  { district: "Corregimiento 14", villages: ["Juntas", "Santa Rita", "San Antonio (Alto)", "El Morro", "San José"] },
  { district: "Puerto Merizalde", villages: ["Chamuscado", "Santa Cruz", "San Joaquincito", "Joaquincito", "San Miguel", "Alambique", "San Martín", "El Cacao", "El Ají", "Isla Ají", "Puerto Merizalde", "San José", "Concherito", "La Vuelta", "San Pedro", "Pastico", "El Trueno", "Limones", "Ajicito", "Aguamansa", "Cocalito", "Majagual", "Corozal", "El Coco", "Resguardo Indígena Eperara Siapidara - Joaquincito", "Betania", "San Fernando", "Nueva Primavera"] },
  { district: "San Francisco", villages: ["Sagrada Familia", "Santa María", "El Carmen", "Calle Larga", "San Antonio", "Corrientes", "Bartola", "Dos Quebradas", "El Pasto", "Chibiru", "San Francisco de Naya", "Marucha"] },
  { district: "La Concepción", villages: ["La Boca", "Juan Núñez", "Juan Santos", "San Bartolo", "San Lorenzo", "California", "El Venado", "Nicolás Ramos Hidalgo", "Concepción", "San Pablo", "Cascajito", "Puerto Naya", "Guadualito", "Solano", "Saladito", "Mina", "Cabildo Indígena Paez Alto Naya", "Pico de Oro", "Risaralda"] },
  { district: "Corregimiento 18", villages: ["Córdoba", "El Oso", "La Esperanza", "Bodegas-La Cascada", "Palito", "Citronela", "La Sierpe", "Zaragoza", "San Cipriano", "El Salto", "Santa Elena", "Cabildo Indígena La Gloria Inga", "La Herradura", "La Gloria", "El Esfuerzo", "El Retiro-Descanso"] },
  { district: "Cisneros", villages: ["Cisneros", "La Delfina", "Pueblo Nuevo", "La Siria", "Planadas", "La Guinea", "El Cedro", "Balsitas", "La Víbora", "Limones", "Perico", "Playa Larga", "Sombrerillo", "El Oso", "Nueva Esperanza", "El Naranjito", "Resguardo Indígena Nasa Embera Chami", "Cabildo Indígena Nasa Kiwe"] },
];

function named(locality: Neighborhood["locality"], commune: number, names: string[]): Neighborhood[] {
  return names.map((name) => ({ locality, commune, name }));
}

function toTitle(value: string) {
  return value.toLocaleLowerCase("es-CO").replace(/(^|[\s.-])([a-záéíóúüñ])/g, (_, separator, letter) => `${separator}${letter.toLocaleUpperCase("es-CO")}`);
}
