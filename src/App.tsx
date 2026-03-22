import type { FC } from 'react'
import {
  BrowserRouter,
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
import UserProfileUpdated from "./Pages/UserInfo/UserProfile/UserProfileUpdated"
import PaymentGateway from "./Pages/PaymentGateway/PaymentGateway"
import UserInfoV2 from "./Pages/UserInfoV2/UserInfoV2"
import UserProfile from "./Pages/UserInfo/UserProfile/UserProfile"
import AddDeposite from "./Pages/UserInfo/UserWallet/AddDeposite"
import UserTransactions from "./Pages/UserInfo/UserTransactions/UserTransactions"
import UserTraveler from "./Pages/UserInfo/UserTraveler/UserTraveler"
import AddTraveler from "./Pages/UserInfo/UserTraveler/AddTraveler"
import PaymentSuccess from "./Pages/PaymentGateway/PaymentSuccess/PaymentSuccess"
import PaymentCancelled from "./Pages/PaymentGateway/PaymentCancelled/PaymentCancelled"
import ScrollToTop from "./ScrollToTop"
import PaymentFailed from "./Pages/PaymentGateway/PaymentFailed/PaymentFailed"
import OtpVerification from "./Pages/SignUp/OtpVerification"
import ForgetEmail from "./Pages/SignUp/ForgetEmail"
import ChangePassword from "./Pages/SignUp/ChangePassword"
import PrivacyPolicy from "./Pages/Policy/PrivacyPolicy/PrivacyPolicy"
import NoBookingsFound from "./Shared/AnimationError/NoBookingsFound/NoBookingsFound"
import PageNotFound from "./Shared/AnimationError/NoBookingsFound/PageNotFound"
import AboutUs from "./Pages/Policy/AboutUs/AboutUs"
import FlightLoading from "./Pages/OneWay/FlightLoading"
import Booking from "./Pages/UserInfo/UserBooking/Booking"
import TermsConditions from "./Pages/TermsConditions/TermsConditions"
import Test from "./Test"
import Blog from "./Pages/Blog/Blog"
import Contact from "./Pages/Contact/Contact"
import Hotel from "./Pages/Hotel/Hotel"
import TourSearchResultNew from "./Pages/Tour/TourSearchResult/TourSearchResultNew"
import TourDetails from "./Pages/Tour/TourDetails/TourDetails"
import Footer from "./Shared/Footer/Footer"

const App: FC = () => {

  return (
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
        <div className="relative z-10">
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
          <Route path="/nobooking" element={<NoBookingsFound />} />
          <Route path="/signIn" element={<SignIn />} />
          {/* booking route  */}

          <Route
          >
            <Route path="/selectedflightdetails" element={<BookingDetaills />} />
            <Route path="/bookingdetails" element={<BookingDetaills />} />
            <Route path="/previewbooking" element={<PreviewBooking />} />
            <Route path="/bookingconfirmation" element={<BookingConfirmation />} />
            <Route path="/bookingquedetails" element={<BookingQueInfo />} />
            <Route path="/paymentgateway" element={<PaymentGateway />} />
            <Route path="/paymentsuccess" element={<PaymentSuccess />} />
            <Route path="/paymentcancelled" element={<PaymentCancelled />} />
            <Route path="/paymentfailed" element={<PaymentFailed />} />
            {/* userDashbord Route  */}
            <Route  >
              <Route path="/userinfov2" element={<UserInfoV2 />}>
                <Route path="userprofile" element={<UserProfile />} />
                {/* <Route path="userbooking" element={<UserBooking />} /> */}
                <Route path="userbooking" element={<Booking />} />
                {/* <Route path="userwallet" element={<UserWallet />} /> */}
                <Route path="adddeposite" element={<AddDeposite />} />
                <Route path="usertransctions" element={<UserTransactions />} />
                <Route path="usertraveler" element={<UserTraveler />} />
                <Route path="addtravler" element={<AddTraveler />} />
                <Route path="updateprofilev2" element={<UserProfileUpdated />} />
              </Route>
            </Route>
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
        </div>
        <Footer />
      </BrowserRouter>
      <ToastContainer />
    </div>
  )
}

export default App
