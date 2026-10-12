// Nombres en español de ciudades cuyo nombre local es distinto
export const EN_ESPANOL = {
  'Genève': 'Ginebra', 'London': 'Londres', 'Zürich': 'Zúrich', 'Munich': 'Múnich', 'Köln': 'Colonia',
  'Milan': 'Milán', 'Rome': 'Roma', 'Florence': 'Florencia', 'Turin': 'Turín', 'Naples': 'Nápoles',
  'Venice': 'Venecia', 'Genoa': 'Génova', 'Lisbon': 'Lisboa', 'Porto': 'Oporto', 'Brussels': 'Bruselas',
  'Antwerpen': 'Amberes', 'Amsterdam': 'Ámsterdam', 'The Hague': 'La Haya', 'Copenhagen': 'Copenhague',
  'Stockholm': 'Estocolmo', 'Athens': 'Atenas', 'Warsaw': 'Varsovia', 'Prague': 'Praga', 'Vienna': 'Viena',
  'Bern': 'Berna', 'Basel': 'Basilea', 'Lausanne': 'Lausana', 'Edinburgh': 'Edimburgo', 'Dublin': 'Dublín',
  'Frankfurt am Main': 'Fráncfort', 'Hamburg': 'Hamburgo', 'Berlin': 'Berlín', 'Paris': 'París',
  'Marseille': 'Marsella', 'Bordeaux': 'Burdeos', 'Toulouse': 'Toulouse', 'Strasbourg': 'Estrasburgo',
  'Nice': 'Niza', 'Bucharest': 'Bucarest', 'Kyiv': 'Kiev', 'Cracow': 'Cracovia', 'Dresden': 'Dresde',
  'Nuremberg': 'Núremberg', 'Stuttgart': 'Stuttgart', 'Luxembourg': 'Luxemburgo', 'Belgrade': 'Belgrado',
  'Helsinki': 'Helsinki', 'Oslo': 'Oslo', 'Reykjavík': 'Reikiavik', 'Valletta': 'La Valeta',
}

export const nombreCiudad = (canonico) => EN_ESPANOL[canonico] || canonico

