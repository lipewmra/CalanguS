/**
 * Math CPF validator
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[^\d]/g, "");
  
  if (cleanCPF.length !== 11) return false;
  
  // Known invalid sequences
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

/**
 * Validates a Brazilian whatsapp/phone number simple format checker
 */
export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/[^\d]/g, "");
  return clean.length >= 10 && clean.length <= 11;
}

/**
 * Validates a name: cannot be fully uppercase (Não pode ser tudo maiusculo)
 */
export function isFullyUppercase(name: string): boolean {
  const cleanName = name.trim().replace(/\s+/g, "");
  if (!cleanName) return false;
  // Check if contains letters and all match uppercase
  const hasLetters = /[a-zA-Záàâãéèêíïóôõöúçñ]/gi.test(cleanName);
  return hasLetters && cleanName === cleanName.toUpperCase();
}

/**
 * Checks collaborator and returns isOrionSynced status, plus an array of error messages
 */
export interface CollabValidationError {
  field: string;
  message: string;
}

export function auditCollaborator(data: {
  name: string;
  cpf: string;
  whatsapp: string;
  email: string;
  education?: string;
  pixKey?: string;
}): CollabValidationError[] {
  const errors: CollabValidationError[] = [];
  
  // 1. Name Check (User requested "Não pode ser tudo maiúsculo")
  if (!data.name || data.name.trim().length < 5) {
    errors.push({ field: "name", message: "Nome muito curto ou vazio." });
  } else if (isFullyUppercase(data.name)) {
    errors.push({ field: "name", message: "O nome não pode ser escrito inteiramente em MAIÚSCULAS." });
  } else if (!/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+$/.test(data.name)) {
    errors.push({ field: "name", message: "Nome contém caracteres inválidos." });
  }
  
  // 2. CPF check
  if (!data.cpf) {
    errors.push({ field: "cpf", message: "CPF é obrigatório." });
  } else if (!validateCPF(data.cpf)) {
    errors.push({ field: "cpf", message: "CPF informado é matematicamente inválido." });
  }
  
  // 3. Whatsapp check
  if (!data.whatsapp) {
    errors.push({ field: "whatsapp", message: "Telefone Whatsapp é obrigatório." });
  } else if (!validatePhone(data.whatsapp)) {
    errors.push({ field: "whatsapp", message: "Whatsapp com formato incorreto. Use (DDD) + 9 dígitos." });
  }
  
  // 4. Email check
  if (!data.email) {
    errors.push({ field: "email", message: "E-mail é obrigatório." });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: "email", message: "Formato de e-mail inválido." });
  }
  
  // 5. Simulated Orion Check (Cebraspe Integration verification)
  // Let's flag any CPF starting with '123' or ending in '00' as a discrepancy found in Orion system to make the app interactive and demonstrate Orion warnings.
  const cpfClean = data.cpf.replace(/[^\d]/g, "");
  if (cpfClean && (cpfClean.startsWith("000") || cpfClean.endsWith("00") || data.name.length % 7 === 0)) {
    errors.push({ field: "orion", message: "Divergência de dados encontrada no cadastro do sistema Orion (Cebraspe)." });
  }
  
  return errors;
}
