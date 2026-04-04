export interface Court {
  name: string;
  city: string;
  type: 'PRIMARY' | 'APPEAL' | 'COMMERCIAL' | 'ADMINISTRATIVE' | 'SUPREME';
}

export const MOROCCAN_COURTS: Court[] = [
  // Primary Courts (Tribunaux de Première Instance)
  { name: 'المحكمة الابتدائية بالدار البيضاء', city: 'Casablanca', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بالرباط', city: 'Rabat', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بمراكش', city: 'Marrakech', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بفاس', city: 'Fes', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بطنجة', city: 'Tangier', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بأكادير', city: 'Agadir', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بمكناس', city: 'Meknes', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بوجدة', city: 'Oujda', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بالقنيطرة', city: 'Kenitra', type: 'PRIMARY' },
  { name: 'المحكمة الابتدائية بتطوان', city: 'Tetouan', type: 'PRIMARY' },
  
  // Courts of Appeal (Cours d'Appel)
  { name: 'محكمة الاستئناف بالدار البيضاء', city: 'Casablanca', type: 'APPEAL' },
  { name: 'محكمة الاستئناف بالرباط', city: 'Rabat', type: 'APPEAL' },
  { name: 'محكمة الاستئناف بمراكش', city: 'Marrakech', type: 'APPEAL' },
  { name: 'محكمة الاستئناف بفاس', city: 'Fes', type: 'APPEAL' },
  { name: 'محكمة الاستئناف بطنجة', city: 'Tangier', type: 'APPEAL' },
  
  // Commercial Courts (Tribunaux de Commerce)
  { name: 'المحكمة التجارية بالدار البيضاء', city: 'Casablanca', type: 'COMMERCIAL' },
  { name: 'المحكمة التجارية بالرباط', city: 'Rabat', type: 'COMMERCIAL' },
  { name: 'المحكمة التجارية بفاس', city: 'Fes', type: 'COMMERCIAL' },
  { name: 'المحكمة التجارية بمراكش', city: 'Marrakech', type: 'COMMERCIAL' },
  { name: 'المحكمة التجارية بطنجة', city: 'Tangier', type: 'COMMERCIAL' },
  
  // Administrative Courts (Tribunaux Administratifs)
  { name: 'المحكمة الإدارية بالرباط', city: 'Rabat', type: 'ADMINISTRATIVE' },
  { name: 'المحكمة الإدارية بالدار البيضاء', city: 'Casablanca', type: 'ADMINISTRATIVE' },
  { name: 'المحكمة الإدارية بفاس', city: 'Fes', type: 'ADMINISTRATIVE' },
  { name: 'المحكمة الإدارية بمراكش', city: 'Marrakech', type: 'ADMINISTRATIVE' },
  
  // Supreme Court
  { name: 'محكمة النقض بالرباط', city: 'Rabat', type: 'SUPREME' }
];
