import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import data from './assets/init.json';

type CurrenciesProps = {
  available: string[];
  rates: {
    [key: string]: number;
  }
}

type TransactionProps = {
  type: "expenses" | "income";
  amount: number;
  comment: string;
  date: number;
}

type AccountProps = {
  name: string;
  currency: string;
  balance: number;
  transactions: TransactionProps[];
}

type AccountsProps = AccountProps[];

function getData() {
  const local = localStorage.getItem('accounts')
  return (local ? JSON.parse(local) : data.accounts) as AccountsProps;
}

function App() {
  const [totalBalance, setTotalBalance] = useState(0);
  const [currency, setCurrency] = useState(data.currencies.base);

  useEffect(() => {
    const totalBalance = getData().reduce((total, { currency: fromCurrency, balance }) => {
      return total + exchange(fromCurrency, currency, balance);
    }, 0);
    setTotalBalance(totalBalance);
  }, [])

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const toCurrency = event.target.value;
    const totalBalanceNewCurrency = exchange(currency, toCurrency, totalBalance);
    setTotalBalance(totalBalanceNewCurrency);
    setCurrency(toCurrency);
  }

  function updateTotalBalance(fromCurrency: string, value: number) {
    const accountBalance = exchange(fromCurrency, currency, value);
    setTotalBalance(prev => Math.round((prev + accountBalance) * 100 + Number.EPSILON) / 100);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '1.5rem' }}>Total balance: {totalBalance}</span>
        <CurrenciesSelect currency={currency} onChange={handleChange} />
      </div>
      <hr/>
      <Accounts updateTotalBalance={updateTotalBalance} />
    </div>
  );
}

export default App;

function CurrenciesSelect({currency, onChange }: any) {
  return (
    <select name="currency" value={currency} onChange={onChange}>
      {data.currencies.available.map((availableCurrency, index) => (
        <option key={index} value={availableCurrency}>{availableCurrency}</option>
      ))}
    </select>
  )
}

export function exchange(from: string, to: string, value: number) {
  const rates = data.currencies.rates as CurrenciesProps['rates'];
  const totalBalanceNewCurrency = rates[to] / rates[from] * value;
  return Math.round(totalBalanceNewCurrency * 100 + Number.EPSILON) / 100;
}

function Accounts({ updateTotalBalance }: any) {
  const newAccountInit = {
    name: '',
    balance: 0,
    currency: 'EUR',
    transactions: []
  }
  const [accounts, setAccounts] = useState<AccountsProps>(getData());
  const [newAccount, setNewAccount] = useState(newAccountInit);

  function updateAccount(newAccount: AccountProps) {
    const oldAccount = accounts.find(account => account.name === newAccount.name) || { balance: 0 };
    setAccounts(prev => prev.map(account => account.name === newAccount.name ? newAccount : account));
    updateTotalBalance(newAccount.currency, newAccount.balance - oldAccount.balance);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const value = event.target.value;
    setNewAccount((prev: any) => ({
      ...prev,
      [event.target.name]: event.target.type === 'number' && value ? parseInt(value) : value
    }))
  }

  function addAccount() {
    if (!newAccount.name) return;
    updateTotalBalance(newAccount.currency, newAccount.balance);
    setAccounts(prev => [...prev, newAccount]);
    setNewAccount(newAccountInit)
  }

  function handleDelete(index: number) {
    const cpAccounts = [...accounts];
    const deletedAccount = cpAccounts.splice(index, 1)[0];
    setAccounts(cpAccounts);
    updateTotalBalance(deletedAccount.currency, -deletedAccount.balance);
  }

  function handleMove(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex - 1 > accounts.length) return;

    const account = {...accounts[fromIndex]};
    const cpAccounts = [...accounts];
    cpAccounts.splice(fromIndex, 1);
    cpAccounts.splice(toIndex, 0, account);

    setAccounts(cpAccounts)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid', paddingBottom: '1rem' }}>
        <input value={newAccount.name} name="name" onChange={handleChange} type="text" placeholder="New account name"/>
        <input value={newAccount.balance} name="balance" onChange={handleChange} type="number" placeholder="New account balance"/>
        <CurrenciesSelect currency={newAccount.currency} onChange={handleChange} />
        <button onClick={addAccount}>Add new account</button>
        <button style={{ marginLeft: 'auto' }} onClick={() => localStorage.setItem('accounts', JSON.stringify(accounts))}>Save</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {accounts.map((account, index) => (
          <Account key={account.name} moveLeft={() => handleMove(index, index-1)} moveRight={() => handleMove(index, index+1)} account={account} updateAccount={updateAccount} handleDelete={() => handleDelete(index)}/>
        ))}
      </div>
    </div>
  )
}

function Account({ account, updateAccount, handleDelete, moveLeft, moveRight }: any ) {
  const [transactions, setTransactions] = useState<TransactionProps[]>(account.transactions as TransactionProps[])
  const [transaction, setTransaction] = useState({
    amount: 0,
    comment: ''
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setTransaction(prev => ({
      ...prev,
      [event.target.name]: event.target.type === 'number' && value ? parseInt(value) : value
    }));
  }

  function handleAction(type: TransactionProps['type']) {
    const newTransaction = {
      ...transaction,
      type,
      date: Date.now()
    }
    const sign = { expenses: -1, income: +1 }
    const newTransactions = [newTransaction, ...transactions]
    updateAccount({
      ...account,
      balance: account.balance + sign[type] * newTransaction.amount,
      transactions: newTransactions
    })
    setTransactions(newTransactions)
    setTransaction({
      amount: 0,
      comment: ''
    })
  }

  function handleDeleteTransaction(index: number) {
    const cpTransactions = [...transactions];
    const deletedTransaction = cpTransactions.splice(index, 1)[0];
    const sign = { expenses: -1, income: +1 }
    const newTransactions = transactions.filter((_, i) => i !== index);
    setTransactions(newTransactions)
    updateAccount({
      ...account,
      balance: account.balance - sign[deletedTransaction.type] * deletedTransaction.amount,
      transactions: newTransactions
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h3>{account.name} <button onClick={handleDelete}>delete</button></h3>
      <span>balance: {account.balance} {account.currency}</span>
      <hr style={{ width: '100%' }}/>
      <input value={transaction.amount} onChange={handleChange} name="amount" type="number" placeholder="Amount"/>
      <input value={transaction.comment} onChange={handleChange} name="comment" type="text" placeholder="Comment"/>
      <div style={{ display: 'flex' }}>
        <button onClick={() => handleAction('expenses')} style={{ flex: '1' }}>Expenses</button>
        <button onClick={() => handleAction('income')} style={{ flex: '1' }}>Income</button>
      </div>
      <hr style={{ width: '100%' }}/>
      <div style={{ display: 'flex' }}>
        <button style={{ flex: '1' }} onClick={moveLeft}>{'<'}</button>
        <button style={{ flex: '1' }} onClick={moveRight}>{'>'}</button>
      </div>
      <hr style={{ width: '100%' }}/>
      {transactions.map((transaction, index) => (
        <Movement key={transaction.date} onDelete={() => handleDeleteTransaction(index)} amount={transaction.amount} type={transaction.type} comment={transaction.comment} currency={account.currency} />
      ))}
    </div>
  )
}

function Movement({amount, currency, comment, type, onDelete}: any) {
  return (
  // @ts-ignore
    <MovementStyled style={{ backgroundColor: ({expenses: 'lightsalmon', income: 'darkseagreen'})[type] }}>
      <div className="header">
        <span>{amount} {currency}</span>
        <div className="actions">
          <button onClick={onDelete}>X</button>
        </div>
      </div>
      <span className="comment">{comment}</span>
    </MovementStyled>
  )
}

const MovementStyled = styled.div`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid;

  :hover {
    .header > .actions {
      visibility: visible;
    }
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;

    .actions {
      visibility: hidden;
    }
  }

  .comment {
    color: white;
    padding: 0 0.5rem 0.5rem;
  }
`
