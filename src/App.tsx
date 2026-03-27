import type { FC } from 'react'
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom"
import { ToastContainer } from "react-toastify"
import Home from "./Pages/Home/Home"
import SignIn from "./Pages/SignUp/SignIn/SignIn"
import SignUp from "./Pages/SignUp/SignUp"
import TourHome from "./Pages/Tour/TourHome/TourHome"
import FlightsResult from "./Pages/FlightResults/FlightsResult"
import BookingDetaills from "./Pages/BookingDetaills/BookingDetaills"
import PreviewBooking from "./Pages/BookingDetaills/PreviewBooking"
import BookingConfirmation from "./Pages/BookingDetaills/BookingConfirmation"
import BookingQueInfo from "./Pages/BookingQueInfo/BookingQueInfo"
import AdminDashboard from "./Pages/Admin/AdminDashboard"
import AdminEntry from "./Pages/Admin/AdminEntry"
import AdminLogin from "./Pages/Admin/AdminLogin"
import ScrollToTop from "./ScrollToTop"
import OtpVerification from "./Pages/SignUp/OtpVerification"
import ForgetEmail from "./Pages/SignUp/ForgetEmail"
import ChangePassword from "./Pages/SignUp/ChangePassword"
import PrivacyPolicy from "./Pages/Policy/PrivacyPolicy/PrivacyPolicy"
import NoBookingsFound from "./Shared/AnimationError/NoBookingsFound/NoBookingsFound"
import PageNotFound from "./Shared/AnimationError/NoBookingsFound/PageNotFound"
import AboutUs from "./Pages/Policy/AboutUs/AboutUs"
import FlightLoading from "./Pages/OneWay/FlightLoading"
import TermsConditions from "./Pages/TermsConditions/TermsConditions"
import Test from "./Test"
import Blog from "./Pages/Blog/Blog"
import Contact from "./Pages/Contact/Contact"
import Hotel from "./Pages/Hotel/Hotel"
import TourSearchResultNew from "./Pages/Tour/TourSearchResult/TourSearchResultNew"
import TourDetails from "./Pages/Tour/TourDetails/TourDetails"
import Footer from "./Shared/Footer/Footer"
import MyAccountPanel from "./Pages/MyAccount/MyAccountPanel"
import BookingDetailsPage from "./Pages/MyAccount/BookingDetailsPage"
import { flyjattTheme } from "./theme/flyjattTheme";

const App: FC = () => {

  return (
    <ThemeProvider theme={flyjattTheme}>
      <CssBaseline />
      <a href="#main-content" className="travelport-skip-link">
        Skip to main content
      </a>
      <div className="travelport-shell relative min-h-screen overflow-x-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_10%_0%,rgba(0,154,214,0.24),transparent_58%)]" />
        <div className="pointer-events-none absolute right-[-120px] top-[120px] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.2),transparent_70%)]" />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollToTop />
          <main id="main-content" className="relative z-10 travelport-route-frame">
            <Routes>
              <Route path="/" element={<Home />} />
              {/* Next.js serves /homepage as a dedicated route; keep Router in sync */}
              <Route path="/homepage" element={<Home />} />

              <Route path="/offers" element={<FlightsResult />} />
              <Route path="/flightsresult" element={<FlightsResult />} />
              <Route path="/onewaysearchresult" element={<FlightsResult />} />
              <Route path="/roundwaysearchresult" element={<FlightsResult />} />
              <Route path="/roundsearchresult" element={<FlightsResult />} />
              <Route path="/multicitysearchresult" element={<FlightsResult />} />
              <Route path="/OtpVerification" element={<OtpVerification />} />
              <Route path="/OtpEmail" element={<ForgetEmail />} />
              <Route path="/resetpassword" element={<ChangePassword />} />
              <Route path="/privacypolicy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/blogs" element={<Blog />} />
              <Route path="/nobooking" element={<NoBookingsFound />} />
              <Route path="/signIn" element={<SignIn />} />
              <Route path="/my-account" element={<Navigate to="/my-account/dashboard" replace />} />
              <Route path="/my-account/dashboard" element={<MyAccountPanel />} />
              <Route path="/my-account/profile" element={<MyAccountPanel />} />
              <Route path="/my-account/booking" element={<MyAccountPanel />} />
              <Route path="/my-account/paymnet" element={<MyAccountPanel />} />
              <Route path="/my-account/travelbuddy" element={<MyAccountPanel />} />
              <Route path="/my-account/case" element={<MyAccountPanel />} />
              <Route path="/my-account/help-center" element={<MyAccountPanel />} />
              <Route path="/my-account/bookingdetails" element={<BookingDetailsPage />} />
              <Route path="/admin" element={<AdminEntry />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {/* booking route  */}

              <Route>
                <Route path="/selectedOffer" element={<BookingDetaills />} />
                <Route path="/bookingdetails" element={<BookingDetaills />} />
                <Route path="/previewbooking" element={<PreviewBooking />} />
                <Route path="/bookingconfirmation" element={<BookingConfirmation />} />
                <Route path="/bookingquedetails" element={<BookingQueInfo />} />
              </Route>

              {/* tour routes  */}
              <Route path="/toursearchresult" element={<TourSearchResultNew />} />
              <Route path="/tourdetails" element={<TourDetails />} />
              <Route path="/tour" element={<TourHome />} />
              <Route path="/hotel" element={<Hotel />} />
              <Route path="/signUp" element={<SignUp />} />
              {/* <Route path="/test" element={<FlightForm />} /> */}
              <Route path="/test1" element={<FlightLoading />} />
              <Route path="/test" element={<Test />} />
              <Route path="*" element={<PageNotFound />} /> {/* Not Found route */}
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
        <ToastContainer />
      </div>
    </ThemeProvider>
  )
}

export default App
