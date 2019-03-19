const { ipcRenderer } = require('electron');
const axios = require('axios');
const moment = require('moment');
moment.locale('ru');

const API_URL = 'http://resources.finance.ua/ru/public/currency-cash.json';

const mapTypeCodeToString = type => type === 1 ? 'банк' : 'обменник';

const formatNumber = numberInStr => Number(numberInStr).toFixed(3);

const getOrgsWorkingWithUSD = orgs => orgs.filter(org => org.currencies.USD);

// an element which is shown when common troubles happen (f.e. with internet)
class WarnLine {
	constructor() {
		this.isShown = false;
		this.node = document.querySelector('.warn-line');
	}

	show() {
		this.isShown = true;
		this.node.classList.remove('is-element-hidden');
		return this;
	}

	hide() {
		this.isShown = false;
		this.node.classList.add('is-element-hidden');
	}

	noDataInDB() {
		this.node.textContent = 'В базе нет нужных данных';
	}

	noConnection() {
		this.node.textContent = 'Ресурс недоступен или отсутствует соединение с интернетом. Посмотрите сохраненные результаты запросов.';
	}

	noDesiredData() {
		this.node.textContent = 'Сайт не прислал данных о курсе доллара(совсем!). Посмотрите результаты предыдущих запросов.';
	}
}

class CurrenciesDate {
	constructor() {
		this.date = null;
		this.node = document.querySelector('.date');
	}

	set(date) {
		this.date = moment(date);
		return this;
	}

	get() {
		return this.date.valueOf();
	}

	display() {
		this.node.textContent = this.date.format('MMMM Do YYYY, H:mm');
	}
}

class CurrenciesList {
	constructor() {
		this.orgs = null;
		this.parentNode = document.querySelector('.orgs-list');
		this.nodes = document.getElementsByClassName('orgs-list__item');
		this.nodeCopy = document.querySelector('.orgs-list__item');
	}

	set(organizations) {
		this.orgs = organizations;
		return this;
	}

	appendItems(itemsToAppend) {
		for (let i = 0; i < itemsToAppend; i += 1) {
			this.parentNode.appendChild(this.nodeCopy.cloneNode(true));
		}
	}

	hideItems(itemsToDisplay, itemsMounted) {
		for (let i = itemsToDisplay; i < itemsMounted; i += 1) {
			this.nodes[i].classList.add('is-element-hidden');
		}
	}

	prepareBeforeDisplaying() {
		const itemsToDisplay = this.orgs.length;
		const itemsMounted = this.nodes.length;
		if (itemsMounted < itemsToDisplay) {
			this.appendItems(itemsToDisplay - itemsMounted);
		} else if (itemsMounted > itemsToDisplay) {
			this.hideItems(itemsToDisplay, itemsMounted);
		}
	}

	display() {
		this.prepareBeforeDisplaying();
		for (let i = 0; i < this.orgs.length; i += 1) {
			const { title, orgType, currencies } = this.orgs[i];
			const { ask, bid } = currencies.USD;
			const type = mapTypeCodeToString(orgType);
			const askFixed = formatNumber(ask);
			const bidFixed = formatNumber(bid);
			this.nodes[i].classList.remove('is-element-hidden');
			this.nodes[i].querySelector('.orgs-list__item__name').textContent = title;
			this.nodes[i].querySelector('.orgs-list__item__type').textContent = type;
			this.nodes[i].querySelector('.orgs-list__item__currency__ask').textContent = askFixed;
			this.nodes[i].querySelector('.orgs-list__item__currency__bid').textContent = bidFixed;
		}
	}
}

const warnLine = new WarnLine();
const currenciesList = new CurrenciesList();
const currenciesDate = new CurrenciesDate();

const requestDataFromRemote = async () => {
  try {
    return await axios.get(API_URL);
  } catch (error) {
    console.error(error);
  	return null;
  }
};

const changeWindowState = (date, organizations) => {
	warnLine.hide();
	const filteredOrgs = getOrgsWorkingWithUSD(organizations);
	if (!filteredOrgs.length) {
		warnLine.show().noDesiredData();
		return;
	}
	currenciesDate.set(date).display();
	currenciesList.set(filteredOrgs).display();
};

const main = async () => {
  const response = await requestDataFromRemote();
  if (response) {
	  const { date, organizations } = response.data;
	  ipcRenderer.send('dataFetchedFromRemote', { date, organizations });
		changeWindowState(date, organizations);
	} else {
		warnLine.show().noConnection();
	}
};

ipcRenderer.on('dataSentFromDB', (event, data) => {
	if (data) {
		changeWindowState(data.date, data.organizations);
	} else {
		warnLine.show().noDataInDB();
	}
});

document.addEventListener('DOMContentLoaded', () => main());

document.querySelector('.btn-form').addEventListener('click', (event) => {
	event.preventDefault();
	event.stopPropagation();
	if (event.target.classList.contains('btn-form__prev-date')) {
		ipcRenderer.send('dataRequestedFromDB', {
			date: currenciesDate.get(),
			changeDateTo: 'previous',
			warning: warnLine.isShown,
		});
	} else if (event.target.classList.contains('btn-form__next-date')) {
			ipcRenderer.send('dataRequestedFromDB', {
				date: currenciesDate.get(),
				changeDateTo: 'next',
				warning: warnLine.isShown,
			});
		}
});
