const sqlite = require('sqlite');
const {
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
} = require('./queries.js');

let db;
const dbFileName = 'usd_currencies';

const createDB = async () => {
  try {
    db = await sqlite.open(`${__dirname}/${dbFileName}.sqlite`, { Promise });
    await Promise.all([db.run(createDatesTable()), db.run(createOrganizationsTable())]);
    // creatе Currencies table separately because it depends on previous tables
    db.run(createCurrenciesTable());
  } catch (error) {
    console.error(error);
  }
};

// filter orgs list to leave only those which work with USD
const getOrgsWorkingWithUSD = orgs => orgs.filter(org => org.currencies.USD);

// convert data got from DB to API-like returned JSON
const convertRowsToJSON = (rows) => {
  const orgs = rows.map(row => ({
    title: row.name,
    orgType: row.type,
    currencies: {
      USD: {
        ask: row.ask_currency,
        bid: row.bid_currency,
      },
    },
  }));
  return { date: rows[0].date, organizations: orgs };
};

// check if fetched data is newer than last one in DB
const checkIfDBNeedsUpdating = async (date) => {
  try {
    const { lastSavedDate } = await db.get(selectLastSavedDate());
    return date > lastSavedDate;
  } catch (error) {
    console.error(error);
  }
};

const saveDataToDB = async (date, organizations) => {
  try {
    await db.run(insertToDatesTable(date));
    const { dateID } = await db.get(selectSpecificDateID(date));
    for (const organization of organizations) {
      const { title, orgType, currencies } = organization;
      const { ask, bid } = currencies.USD;
      // wait for insertion into Organizations, because Currencies depends on it
      await db.run(insertToOrganizationsTable(title, orgType));
      const { orgID } = await db.get(selectSpecificOrganizationID(title));
      db.run(insertToCurrenciesTable(ask, bid, dateID, orgID));
    }
  } catch (error) {
    console.error(error);
  }
};

const processDataBeforeSaving = async ({ date, organizations }) => {
  try {
    const fetchedDate = new Date(date).getTime();
    const filteredOrgs = getOrgsWorkingWithUSD(organizations);
    const needsUpdate = await checkIfDBNeedsUpdating(fetchedDate);
    // save data only if it's new and has USD currencies
    if (needsUpdate && filteredOrgs.length) {
      saveDataToDB(fetchedDate, filteredOrgs);
    }
  } catch (error) {
    console.error(error);
  }
};

const getLastSavedDataFromDB = async () => {
  try {
    const { dateID } = await db.get(selectLastSavedDate());
    const rows = await db.all(selectCurrenciesOnSpecificDate(dateID));
    // return data only if array is not empty
    if (rows && rows.length) {
      return convertRowsToJSON(rows);
    }
  } catch (error) {
    console.error(error);
  }
  return null;
};

const getDataFromDB = async ({ date, changeDateTo, warning }) => {
  try {
    if (warning) {
      return await getLastSavedDataFromDB();
    }
    // get dateID of currently displayed data
    const { dateID } = await db.get(selectSpecificDateID(date));
    // get dateID of data to display next
    const requestedDateID = changeDateTo === 'previous' ? dateID - 1 : dateID + 1;
    // if requested ID exists
    if (requestedDateID > 0) {
      const rows = await db.all(selectCurrenciesOnSpecificDate(requestedDateID));
      // return data only if array is not empty
      if (rows && rows.length) {
        return convertRowsToJSON(rows);
      }
    }
  } catch (error) {
    console.error(error);
  }
  return null;
};

module.exports = {
  createDB,
  getDataFromDB,
  processDataBeforeSaving,
};
