const createDatesTable = () => {
  return `CREATE TABLE IF NOT EXISTS dates (
            id_date INTEGER PRIMARY KEY AUTOINCREMENT,
            date INTEGER NOT NULL);`;
};

const createOrganizationsTable = () => {
  return `CREATE TABLE IF NOT EXISTS organizations (
            id_organization INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type INTEGER NOT NULL);`;
};

const createCurrenciesTable = () => {
  return `CREATE TABLE IF NOT EXISTS currencies (
            id_currency INTEGER PRIMARY KEY AUTOINCREMENT,
            ask_currency REAL NOT NULL,
            bid_currency REAL NOT NULL,
            id_organization INTEGER NOT NULL,
            id_date INTEGER NOT NULL,
            FOREIGN KEY (id_organization) REFERENCES organizations(id_organization),
            FOREIGN KEY (id_date) REFERENCES dates(id_date));`;
};

const insertToDatesTable = (date) => {
  return `INSERT INTO dates (date)
            SELECT ${date} WHERE NOT EXISTS(SELECT * FROM dates WHERE date = ${date});`;
};

const insertToOrganizationsTable = (orgName, orgType) => {
  return `INSERT INTO organizations (name, type)
            SELECT '${orgName}', ${orgType} 
              WHERE NOT EXISTS(SELECT * FROM organizations 
                WHERE name = '${orgName}' AND type = ${orgType});`;
};

const insertToCurrenciesTable = (ask, bid, dateID, orgID) => {
  return `INSERT INTO currencies (ask_currency, bid_currency, id_organization, id_date)
            VALUES (${ask}, ${bid}, ${orgID}, ${dateID});`;
};

const selectCurrenciesOnSpecificDate = (dateID) => {
  return `SELECT ask_currency, bid_currency, name, type, date from currencies 
            LEFT JOIN dates on currencies.id_date = dates.id_date
            LEFT JOIN organizations on currencies.id_organization = organizations.id_organization
            WHERE dates.id_date = ${dateID};`;
};

const selectSpecificDateID = (date) => {
  return `SELECT id_date AS dateID FROM dates WHERE date = ${date};`;
};

const selectSpecificOrganizationID = (orgName) => {
  return `SELECT id_organization AS orgID FROM organizations WHERE name = '${orgName}';`;
};

const selectLastSavedDate = () => {
  return 'SELECT id_date AS dateID, MAX(date) AS lastSavedDate FROM dates;';
};

module.exports = {
  createDatesTable,
  createOrganizationsTable,
  createCurrenciesTable,
  insertToDatesTable,
  insertToOrganizationsTable,
  insertToCurrenciesTable,
  selectLastSavedDate,
  selectSpecificDateID,
  selectSpecificOrganizationID,
  selectCurrenciesOnSpecificDate,
};
