import { useState } from 'react'
import Register from './components/register.jsx'
import Login from './components/login.jsx'
import Navbar from './components/navbar.jsx'
import Library from './components/library.jsx'


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar/>      
      <Library path = "/library"/>
      <Register path = "/register"/>
      <Login path = "/login"/>
    </>

  )
}

export default App
