import "./App.css";

import Menu from "./Menu.js";
import Game from "./Game.js";
import Login from "./Login.js";
import Mode from "./Mode.js";
import Dashboard from "./Dashboard.js";
import Customize from "./Customization.js";
import Register from "./Register.js";
import Gatcha from "./Gatcha";
import Purchase from "./Purchase";
import GameOrganizerEngine from "./GameOrganizerEngine";
import { useAuth } from "./AuthContext";
import Knug from "./images/icons/knug.png";

import "./CreateFirebaseEngine";

import { useState, useEffect } from "react";
import MainMenu from "./MainMenu";

function App() {
  const [page, setPage] = useState("menu");

  const [game_id, setGameId] = useState("");
  const [user_id, setUserId] = useState("");
  const [game_mode, setGameMode] = useState(-1);
  const { currentUser, didLogIn, didRegister, logOut, authEngine } = useAuth();

  console.log(currentUser);

  function GetPage() {
    switch (page) {
      case "login":
        return (
          <Login
            auth_engine={authEngine}
            DidLogIn={DidLogIn}
            BackToMenu={BackToMenu}
          />
        );
      case "register":
        return (
          <Register
            auth_engine={authEngine}
            DidRegister={DidRegister}
            BackToMenu={BackToMenu}
          />
        );
      case "menu":
        return <Menu ToLogin={ToLogin} ToRegister={ToRegister} />;
      case "gatcha":
        return <Gatcha BackToMenu={BackToMenu} />;
      case "main":
        return (
          <MainMenu
            LogOut={LogOut}
            SelectMode={SelectMode}
            ToCustomize={ToCustomize}
            ToGatcha={ToGatcha}
          />
        );
      case "purchase":
        return <Purchase setPage={setPage} />;
      case "dashboard":
        return <Dashboard setPage={setPage} />;
      case "game":
        return <Game game_mode={game_mode} />;
      case "mode":
        return (
          <Mode setGameMode={setGameMode} backToMainMenu={BackToMainMenu} />
        );
      case "customize":
        return <Customize backToMainMenu={BackToMainMenu} />;

      default:
        throw Error("Unknown page");
    }
  }

  useEffect(() => {
    if (game_mode !== -1) {
      setPage("game");
    }
  }, [game_mode]);

  useEffect(() => {
    const handleWheel = (e) => e.preventDefault();

    window.addEventListener("wheel", handleWheel, { passive: false });

    // Cleanup on unmount
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  function DidLogIn(user_id) {
    didLogIn(user_id);
    setPage("main");
    // Existing code ...
  }

  function DidRegister(id) {
    didRegister(id);
    setPage("menu");
    // Existing code ...
  }

  function TestLogin() {
    // load profile info
    /*
    Username
    Rank Points -> to be converted to rating (i.e Scrubby, Intermediate, Grandmaster, etc)
    All the profile icons that this user has
    Amount of Nuggets (currency)
    */

    setPage("main");

    // IgnoreWarningForTesting();
  }

  function LogOut() {
    setPage("login");
  }

  function ToLogin() {
    setPage("login");
  }

  function ToCustomize() {
    setPage("customize");
  }

  function ToGatcha() {
    setPage("gatcha");
  }

  function ToRegister() {
    setPage("register");
  }

  function SelectMode() {
    setPage("mode");
  }

  function BackToMenu() {
    setPage("menu");
  }

  function BackToMainMenu() {
    setPage("main");
  }

  return (
    <div className="App">
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          width: "200px",
          height: "100px",
        }}
      >
        {currentUser && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                color: "#6e6e6e",
                fontSize: "32px",
                fontWeight: "bold",
              }}
            >
              {currentUser.nuggetCount}
              <img
                src={Knug}
                style={{ marginLeft: 10, width: "30%", height: "60%" }}
              />
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#6e6e6e",
                fontWeight: "bold",
              }}
            >
              {page !== "purchase" ? (
                <button
                  className="BuyButton"
                  style={{ fontSize: "16px" }}
                  onClick={() => setPage("purchase")}
                >
                  Purchase More
                </button>
              ) : (
                <button
                  className="BuyButton"
                  style={{ fontSize: "16px" }}
                  onClick={() => setPage("main")}
                >
                  Go back
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {GetPage()}
    </div>
  );
}

export default App;
