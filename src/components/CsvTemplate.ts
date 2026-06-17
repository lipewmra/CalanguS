import { CollaboratorInfo } from "../types";

export const CSV_HEADERS = [
  "Nome",
  "CPF",
  "Data de Nascimento",
  "Telefone",
  "Email",
  "Escolaridade"
];

export const CSV_EXAMPLE_ROWS = [
  [
    "Carlos Eduardo da Silva",
    "403.201.898-44",
    "05/12/1988",
    "(11) 98765-4321",
    "carlos.silva@email.com",
    "Ensino Superior Completo"
  ],
  [
    "Ana Maria de Oliveira",
    "111.444.777-35",
    "22/07/1992",
    "(11) 91111-2222",
    "ana.maria@email.com",
    "Ensino Médio"
  ],
  [
    "Fabiano Alves Santos",
    "123.456.789-00", // Will trigger simulated warning since we want users to see validation errors
    "14/03/1995",
    "(21) 99888-7766",
    "fabiano.alves@email.com",
    "Ensino Superior Cursando"
  ]
];

export function downloadCsvTemplate() {
  // Use semicolon as separator for high compatibility with standard Brazilian Excel configurations
  const content = [
    CSV_HEADERS.join(";"),
    ...CSV_EXAMPLE_ROWS.map(row => 
      row.map(val => `"${val.replace(/"/g, '""')}"`).join(";")
    )
  ].join("\n");

  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "modelo_importacao_calangus.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
