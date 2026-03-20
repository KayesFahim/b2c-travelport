import React from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CssBaseline,
  AppBar,
  Toolbar,
  Container,
  Paper,
  Divider,
} from "@mui/material";
import NavBar from "../../Shared/NavBar/NavBar";

const TermsConditions = () => {
  return (
    <Box
      sx={{
        height: "100%",
      }}
    >
      <NavBar />
      <Box>
        <Container maxWidth="md" sx={{ my: 4 }}>
          {/* Title */}
          <Typography
            gutterBottom
            sx={{ fontWeight: "bold", textAlign: "center", fontSize: "18px",
              color: "var(--primary-button)",

             }}
          >
            Terms & Conditions
          </Typography>

          {/* Introduction */}
          <Typography
            sx={{
              fontSize: "12px",
              textAlign: "center",
            }}
            gutterBottom
          >
            Welcome to Fly Jatt. Before accessing or using any of our
            services, including our website, products, and materials, please
            carefully review these terms and conditions. By continuing to use or
            access any of Fly Jatt's services, you agree to comply with the
            terms outlined here. Fly Jatt reserves the right to update or
            modify these terms at any time, without prior notice.
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Sections */}
          <Box>
            <Section
              title="1. Acceptance of Terms"
              content="By accessing or using Fly Jatt, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions."
            />
            <Section
              title="2. Modification of Terms"
              content="Fly Jatt retains the right to modify, suspend, or discontinue any portion of its services at any time, and such changes are effective immediately upon posting."
            />
            <Section
              title="3. User Responsibilities"
              content="Users are responsible for regularly reviewing these terms and conditions. Any misuse of Fly Jatt's services, including but not limited to violating any local, state, national, or international laws, will result in immediate termination of access to the service."
            />
            <Section
              title="4. Intellectual Property"
              content="All content provided by Fly Jatt, including but not limited to website text, design, and graphics, is the property of Fly Jatt and is protected by copyright, trademark, and other intellectual property laws."
            />
            <Section
              title="5. Privacy Policy"
              content="Your use of Fly Jatt is also governed by our Privacy Policy, which explains how we collect, protect, and use your personal information."
            />
            <Section
              title="6. Disclaimer of Warranties"
              content="Fly Jatt's services are provided 'as is' and 'as available' without any warranty of any kind, either express or implied."
            />
            <Section
              title="7. Limitation of Liability"
              content="Fly Jatt shall not be liable for any damages, including but not limited to direct, indirect, incidental, consequential, or punitive damages arising from or related to the use or inability to use our services."
            />
            <Section
              title="8. Termination of Access"
              content="Fly Jatt reserves the right to terminate or suspend access to our services for any reason, including violation of these terms, without prior notice."
            />
            <Section
              title="9. Governing Law"
              content="These terms and conditions are governed by and construed in accordance with the laws of [Your Jurisdiction]."
            />
            <Section
              title="10. Contact Us"
              content="For any questions or concerns regarding these terms, please contact us at info@flyjatt.com."
            />
          </Box>

          {/* Note */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                mt: 4,
                p: 1,
                backgroundColor: "#fff8db",
                borderRadius: 1,
                width: "fit-content",
              }}
            >
              <Typography
                sx={{
                  fontSize: "11px",
                }}
              >
                <strong>Note:</strong> These terms constitute the entire
                agreement between you and Fly Jatt and govern your use of
                our services.
              </Typography>
            </Box>
          </Box>

          {/* Reminder Note */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{ mt: 1, p: 1, backgroundColor: "#fff8db", borderRadius: 1 }}
            >
              <Typography
                sx={{
                  fontSize: "11px",
                }}
              >
                <strong>Reminder:</strong> Regularly check this page for updates
                to ensure you are informed about any changes to our terms and
                conditions.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="General Disclaimer"
              content={`Fly Jatt operates solely as a platform to connect travelers with various travel service providers, including airlines, hotels, and tour operators. We do not own, manage, or control any travel products or services offered on our website.`}
            />
            <Section
              title="Responsibilities of Service Providers"
              content={`• All information regarding pricing, availability, and services is provided directly by each service provider (airlines, hotels, tour operators, etc.). Fly Jatt is not responsible for inaccuracies in this information, as the providers are solely responsible for the accuracy and completeness of their listings.\n
                • Market conditions and demand fluctuations may cause occasional discrepancies in prices, availability, and details. Fly Jatt strives to display the latest information available, though we cannot guarantee that all data on the platform is up-to-date at all times.`}
            />
            <Section
              title="Limitations of Liability"
              content={`• Fly Jatt shall not be held liable for any inaccuracies or discrepancies in information provided by third-party service providers.\n
                • In cases of booking or travel-related issues, Fly Jatt will serve as an intermediary and make reasonable efforts to support users in resolving their issues, based on each provider’s terms and policies.`}
            />
            <Section
              title="Booking and Service Disclaimers"
              content={`• Fly Jatt does not guarantee or endorse any specific travel provider, product, or service. Users are advised to review the specific terms, policies, and conditions of each service provider before making a purchase.\n
                • By using our platform, you acknowledge that all travel arrangements, including any cancellations, refunds, or changes, are subject to the provider’s policies and are beyond Fly Jatt’s control.`}
            />
          </Box>

          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Booking Terms"
              content={`Fly Jatt only acts as a platform to connect you with these providers. Before completing any booking, please carefully review and agree to each provider's terms and conditions. If there are any issues with your reservation, Fly Jatt will help as a point of contact and will make reasonable efforts to assist you, following the provider’s policies. Please note that all prices, offers, and availability may change at any time without notice.`}
            />
            <Section
              title="Promotion Terms"
              content={`Fly Jatt may offer promotional codes or discounts for use on our website, with the flexibility to modify, remove, or replace any terms related to these promotions at any time. We may also end a promotional program without prior notice. In the event of any dispute, Fly Jatt’s decision will be considered final. By registering on flyjatt.com, you consent to receive occasional updates from us or our partners regarding offers, products, or services that may interest you.`}
            />
            <Section
              title="Payment Terms"
              content={`By completing a payment on Fly Jatt, you agree to provide personal information necessary for verifying the transaction, which helps protect against unauthorized usage. This information may be shared solely with third-party payment agencies for validation and will not be used for any other purpose. Fly Jatt may also charge a convenience fee, which may vary based on the chosen payment method.`}
            />
            <Section
              title="Cancellation & Refund"
              content={`Fly Jatt follows the cancellation and refund policies set by our travel partners, like airlines, hotels, bus operators, and tour providers. We don’t charge extra service fees for cancellations, reissues, or refunds on flights, hotels, and tours. To request a refund or reissue, please contact Fly Jatt at least 48 hours before your travel date. Refunds usually take 3 to 5 business days to show up, depending on the payment method. Convenience fees are non-refundable, and for EMI payments, any EMI charges will be deducted from the refund. Cash refunds will be sent through your preferred payment method.`}
            />
          </Box>
          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="General Disclaimer"
              content={`Fly Jatt connects customers with third-party travel providers, including airlines, hotels, car rental companies, and tour operators (“Travel Suppliers”), to arrange travel services like flights, lodging, and car rentals (“Service Elements”).
              
              When you use Fly Jatt, you acknowledge that the rates shown may include fees, taxes, and other charges agreed upon by Fly Jatt and the Travel Suppliers. By booking through us, you authorize Fly Jatt to make reservations with these suppliers on your behalf at the total displayed price, which includes all relevant fees.
              
              Please note that Fly Jatt isn’t responsible for site errors or for issues that arise with Travel Suppliers, like airlines or hotels. We do not endorse or guarantee the quality of services provided by these suppliers. If a Travel Supplier fails to deliver a service, Fly Jatt cannot be held responsible for refunds; any claims for reimbursement will need to be directed to the Travel Supplier unless the issue was caused directly by Fly Jatt. If a supplier defaults before delivering a service, you may pursue a refund with the supplier as permitted by law.
              
              Fly Jatt has no control over events beyond its reach, such as price changes, schedule changes, cancellations, strikes, weather events, government restrictions, or other impacts on your booking. We are also not liable for any Travel Supplier’s product descriptions, photos, amenities, or ratings.
              
              While Fly Jatt offers services for travel agents and consumers, we do not control or take responsibility for actions of third-party travel providers. We also cannot guarantee exchange rates for international bookings; prices quoted in local currency are estimates only.
              
              Once a booking is confirmed, it may be non-refundable or have penalties for changes or cancellations. Some tickets may carry specific cancellation or refund penalties. Printed ticket prices might show bulk or different rates than those paid.
              
              Discounts and availability can vary based on factors like airline, travel class, destination, season, advance booking, and flight capacity.
              
              Fly Jatt does not endorse third-party ads on our site.
              
              By booking through Fly Jatt, you agree to the Travel Supplier’s terms and conditions, including their payment policies and rules for using their services. Some Travel Suppliers may request a credit card or deposit at check-in for extra costs not covered in your Fly Jatt payment. Not following a Travel Supplier’s rules may result in booking cancellation, loss of payments made, or additional fees.`}
            />
          </Box>
          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Waiver"
              content={`By using this site, you agree not to make any claims against Fly Jatt, its team, or its affiliates. Fly Jatt and its partners will not be responsible for:\n

              • Any property damage, loss, or injury caused by the actions or issues of travel providers;\n
              • Any inconvenience, loss of enjoyment, or mental distress;
              • Any delays, missed connections, accommodation changes, cancellations, or fare changes;
              • Any cancellations or duplicate bookings that are out of Fly Jatt’s control; or
              • Any issues related to your transportation or other travel services.
              
            Fly Jatt is not responsible for missed or canceled flights or any schedule changes made by airlines.`}
            />
            <Section
              title="Indemnification"
              content={`You agree to protect and hold harmless Fly Jatt, along with its affiliates, partners, and their officers, directors, managers, employees, and agents, from any claims, losses, damages, penalties, costs, or expenses (including reasonable legal and accounting fees) that arise from:
               • Any claims you make, or are made on your behalf, that go beyond the liability limits outlined above, as permitted by your state’s laws;
               • Any third-party claims resulting from your violation of these Terms & Conditions or other documents referenced on this Site;
               • Any violation of laws or third-party rights by you;
               • Your use of this Site.`}
            />
            <Section
              title="Release"
              content={`If you have a dispute with any travel provider (such as airlines, hotels, or tour operators), you agree to release Fly Jatt, its affiliates, partners, and representatives from any claims, demands, or damages (including direct, indirect, incidental, or consequential) related to or arising from that dispute.`}
            />
            <Section
              title="Protecting Your Security"
              content={`To prevent unauthorized use of your credit, debit, or charge card, we may verify the name, address, and contact details you provide during booking with third-party databases. By agreeing to these Terms & Conditions, you allow us to perform these checks, which may involve sharing some of your information with a registered Credit Card Payment Gateway Agency, solely to confirm your identity.`}
            />
          </Box>
          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Site Usage and Ticket Purchase"
              content={`By using Fly Jatt, you confirm that you are at least 18 years old and legally able to agree to these Terms & Conditions. If booking on behalf of others, you agree to inform them of these terms and ensure they follow all applicable rules. You are financially responsible for any bookings or activity on your account, including bookings made by anyone under your guidance.
              
All information you provide must be accurate, current, and complete. You also confirm that any traveler is not an unaccompanied minor. Speculative, false, or fraudulent bookings, or reservations made in anticipation of demand, are strictly prohibited.

If you upload content or interact with others on the site, you must follow all relevant laws and maintain respectful behavior. You agree to indemnify Fly Jatt for any claims resulting from violations of these standards. Any content you upload is considered non-confidential, and Fly Jatt may use, copy, store, and share it.

Fly Jatt may disclose your identity to third parties if they claim your content infringes on intellectual property rights or privacy. We are not responsible for the content posted by users and reserve the right to remove any content that violates these Terms & Conditions.`}
            />
            <Section
              title="Governing Law and Jurisdiction"
              content={`These Terms & Conditions are governed by the laws of Bangladesh. Any disputes must be filed in Dhaka courts, unless otherwise stated in the Mandatory Arbitration section. Claims must be filed within one year from when they arise.`}
            />
            <Section
              title="Improperly Filed Claims"
              content={`All claims must follow the dispute resolution process outlined in these Terms & Conditions. Claims not following this process are deemed improperly filed. If a claim is improperly filed, the other party may seek attorney fees and costs up to BDT 100,000, provided a written notice was given with 14 days for withdrawal.`}
            />
            <Section
              title="Prohibited Activities"
              content={`You may use Fly Jatt’s reservation tools only for legitimate bookings for yourself or authorized persons. Excessive use or misuse of these tools can result in restricted access. You may not use the site for commercial purposes without permission.

Do not use automated tools (such as robots or scrapers) to access content on the site or bypass security measures. You may not copy, modify, distribute, display, or sell any content from the site without permission. Attempts to access the site’s servers or databases without authorization are strictly prohibited, as are cyber-attacks like denial-of-service. Fly Jatt is not liable for damages caused by viruses or other harmful technology.

Fly Jatt reserves the right to cancel your account and restrict access if any prohibited activities are detected.`}
            />
          </Box>
          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Booking Process"
              content={`Some terms have specific meanings:
              
• Service Element: Any individual product (e.g., car rental, hotel, or flight) available on the site.

• Travel Supplier: A provider of one or more Service Elements, such as an airline or hotel chain.

Fly Jatt acts as an intermediary, working with Travel Suppliers to offer services. When you press “Book” on the payment page, it indicates an offer to purchase the selected services. Fly Jatt may accept or decline this offer on behalf of the Travel Supplier.

The booking confirmation email acknowledges your request but is not a contract. The contract is finalized only after payment is processed, and you receive confirmation, including ticket or reservation numbers. Booking details (price, availability, and dates) may change until the contract is finalized. After booking, changes or cancellations are allowed only at Fly Jatt’s discretion and based on these terms.

Photo ID may be required at various points during your trip, depending on the Travel Supplier's requirements. Fly Jatt is not liable for denied boarding or delays if you do not meet these requirements. Entry or exit fees at your destination are your responsibility.

All travelers in a booking must follow the same itinerary, and individual changes are not permitted. Fly Jatt may correct pricing errors, and you can either cancel the booking or cover any price difference.`}
            />
            <Section
              title="Pricing, Taxes/Fees, and Payment"
              content={`Prices shown on the site include applicable taxes and fees, unless otherwise noted. Additional charges, such as baggage fees or seat reservation fees, may apply and must be paid directly to the Travel Supplier. Confirm any extra fees with the provider.

Full payment is required at booking, using a valid credit or debit card. You authorize Fly Jatt and authorized third parties to charge your card for the full amount. You may need to present the card used for booking at check-in or car rental pickup.

Prices and availability are subject to:

• Change without notice.
• Travel date restrictions, minimum/maximum stays, holiday variations, and blackout dates.
• Other limitations based on seating or eligibility.

Reservations are confirmed only after ticketing. Until billing verification is complete, fare availability is not guaranteed. If a selected fare is unavailable, your card may be temporarily held for the amount.`}
            />
          </Box>
          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Cancel and Exchange"
              content={`Most tickets on Fly Jatt are non-refundable. In cases where cancellations are allowed by the airline, a travel credit may be issued for future travel on the same airline. All cancellations must be processed before the departure of the first flight segment. Fly Jatt does not guarantee cancellations and is not responsible for fare differences or airline penalties that apply when rebooking. Refer to the airline’s policy for any specific rules.

Fly Jatt offers a Compassion Exception Policy (CEP) with special discounts for Bangladesh military, natural disaster victims, bereavement, individuals with disabilities, seniors, and youth. Contact customer service for details.`}
            />
            <Section
              title="Multiple Airline Itineraries"
              content={`For itineraries involving multiple airlines, review each airline’s terms on their website. Each airline may have different rules, fees, and requirements. Any changes to one flight may affect others, and additional fees may apply. We recommend printing your e-ticket confirmation as proof of a return ticket may be required at check-in.`}
            />
            <Section
              title="Cancellation and Refund"
              content={`Most tickets, hotel bookings, and prepaid car rentals are non-refundable after the booking date. Cancellations must be requested via email. Refunds are subject to:
              
• Refund eligibility as per fare rules.
• Absence of a “no-show” mark on the booking.
• Approval from the Travel Supplier.

Once a cancellation request is received, Fly Jatt will provide a tracking number, but this does not guarantee a refund. Refunds may take 60-90 business days. Fly Jatt’s original service fees are non-refundable.

Fly Jatt’s Compassion Exception Policy (CEP) offers discounts for specific groups, such as military personnel, disaster victims, and seniors. Please refer to the CEP for details.

To ensure security, all cancellations must be requested from the registered booking email.`}
            />
            <Section
              title="Promo Codes"
              content={`Fly Jatt occasionally offers promo codes for online reservations. Promo codes cover up to 70% of service fees, cannot be exchanged for cash, and are non-transferable. Enter the promo code at checkout to apply the discount. Promo codes may be withdrawn without notice and cannot be combined with other offers.

If a promo code does not work, you may need to cancel the transaction, as we cannot apply credits after purchase.`}
            />
          </Box>

          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Fare Changes and Post-Payment Price Guarantee"
              content={`If a fare or booking detail changes before your payment is processed, Fly Jatt will notify you and give you the option to accept or decline. If you decline, no charges will apply. Once your payment is successfully processed, we guarantee to cover any fare increase up to BDT 1000.`}
            />
            <Section
              title="Payment Acceptance Policy"
              content={`Fly Jatt accepts major credit and debit cards from Bangladesh and other listed countries, as well as Cash in Office, Bkash, and online bank transfers. In some cases, your card may be billed in separate transactions totaling the final amount. If payment is declined or there are changes before processing, you’ll be notified and given the choice to proceed or cancel. Bookings are confirmed only after complete confirmation details are received. For high-risk transactions, Fly Jatt may perform additional verification checks.`}
            />
            <Section
              title="Ticket Delivery"
              content={`Most tickets are issued electronically (e-Tickets). If e-Tickets are unavailable, paper tickets will be delivered by a secure carrier. Fly Jatt is not responsible for delivery delays or errors by the courier. Incorrect address entries may result in extra redelivery charges. For e-Tickets, booking details can be accessed directly on the website.`}
            />
            <Section
              title="Credit/Debit Card Payments"
              content={`• Only cards with verified billing addresses in Bangladesh or other specified countries are accepted.
• Bookings are not guaranteed until ticketed. Card authorizations may place a temporary hold on funds; this hold will be released if the transaction is not completed.
• Fly Jatt is not responsible for card declines, and no charges will apply if a transaction is canceled due to price changes or insufficient funds. High-risk transactions may require further verification.`}
            />
            <Section
              title="Seats, Meals, Frequent Flyer, and Other Requests"
              content={`Seat selection, meal preferences, and other special requests are not guaranteed. Please contact your airline directly to confirm these requests.`}
            />
            <Section
              title="Baggage Policy and Fees"
              content={`Airlines may charge fees for excess baggage. Please refer to your airline’s website for the most current baggage fees and policies.`}
            />
            <Section
              title="Baggage Policy on Connecting Flights"
              content={`If your trip involves multiple airlines, you may need to retrieve and recheck your baggage at connecting airports. Additional fees may apply, so it’s advised to pack lightly.`}
            />
          </Box>

          <Box
            sx={{
              mt: 6,
            }}
          >
            {/* Previously Added Sections */}
            <Section
              title="Airline Schedule Changes and Cancellations"
              content={`Airlines may adjust schedules due to operational requirements, affecting flight times, dates, or destinations. Fly Jatt will try to inform you of any changes, but we recommend confirming flight details with the airline 24-72 hours before departure.`}
            />
            <Section
              title="Unaccompanied Minors"
              content={`Fly Jatt does not sell tickets directly to unaccompanied minors (under 18). Each airline has specific rules, so please check with them for guidelines and fees for minors traveling alone.`}
            />
            <Section
              title="Visa and Entry Requirements"
              content={`It’s your responsibility to confirm the travel documents needed for your trip, including visas. Fly Jatt is not liable if you are denied entry or transit. Booking a ticket does not guarantee entry to your destination.`}
            />
            <Section
              title="Ticket Processing Errors and Disclaimer"
              content={`Fly Jatt is not liable for tickets that cannot be processed due to incorrect card details, technical issues, or fare changes. If flights are unavailable, we may offer alternatives or cancel your booking and notify you.`}
            />
            <Section
              title="Human Error"
              content={`If an error occurs in your booking due to agent error, Fly Jatt will make reasonable efforts to correct it. Compensation up to the total service fee, plus a BDT 2000 coupon, may be provided if the error is reported within 24 hours of confirmation.`}
            />
            <Section
              title="Itinerary Reconfirmation"
              content={`You are responsible for verifying your booking details (names, dates, and flight numbers) within 4 hours of booking completion. If you don’t notify Fly Jatt within this timeframe, it implies that you accept the details as they are.`}
            />
            <Section
              title="Hotel Reservation Rules and Regulations"
              content={`Hotel details, including photos and amenities, are provided by suppliers, and Fly Jatt is not responsible for outdated information. Special requests, such as specific bedding, are not guaranteed. Refunds for unused room nights due to early departure are unavailable. Extra charges, like resort fees or incidentals, must be paid directly to the hotel.`}
            />
            <Section
              title="Hotel Changes, Cancellations, and Refunds"
              content={`Contact Fly Jatt customer service for changes or cancellations to hotel bookings. If you fail to check in without prior notice, penalties may apply. Confirmation numbers can take up to 72 hours to be issued; we recommend reconfirming hotel reservations 24 hours before check-in.`}
            />
          </Box>

          <Box
            sx={{
              mt: 6,
            }}
          >
            {/* Previously Added Sections */}
            <Section
              title="Airline Schedule Changes and Cancellations"
              content={`Airlines may adjust schedules due to operational requirements, affecting flight times, dates, or destinations. Fly Jatt will try to inform you of any changes, but we recommend confirming flight details with the airline 24-72 hours before departure.`}
            />
            <Section
              title="Unaccompanied Minors"
              content={`Fly Jatt does not sell tickets directly to unaccompanied minors (under 18). Each airline has specific rules, so please check with them for guidelines and fees for minors traveling alone.`}
            />
            <Section
              title="Visa and Entry Requirements"
              content={`It’s your responsibility to confirm the travel documents needed for your trip, including visas. Fly Jatt is not liable if you are denied entry or transit. Booking a ticket does not guarantee entry to your destination.`}
            />
            <Section
              title="Ticket Processing Errors and Disclaimer"
              content={`Fly Jatt is not liable for tickets that cannot be processed due to incorrect card details, technical issues, or fare changes. If flights are unavailable, we may offer alternatives or cancel your booking and notify you.`}
            />
            <Section
              title="Human Error"
              content={`If an error occurs in your booking due to agent error, Fly Jatt will make reasonable efforts to correct it. Compensation up to the total service fee, plus a BDT 2000 coupon, may be provided if the error is reported within 24 hours of confirmation.`}
            />
            <Section
              title="Itinerary Reconfirmation"
              content={`You are responsible for verifying your booking details (names, dates, and flight numbers) within 4 hours of booking completion. If you don’t notify Fly Jatt within this timeframe, it implies that you accept the details as they are.`}
            />
            <Section
              title="Hotel Reservation Rules and Regulations"
              content={`Hotel details, including photos and amenities, are provided by suppliers, and Fly Jatt is not responsible for outdated information. Special requests, such as specific bedding, are not guaranteed. Refunds for unused room nights due to early departure are unavailable. Extra charges, like resort fees or incidentals, must be paid directly to the hotel.`}
            />
            <Section
              title="Hotel Changes, Cancellations, and Refunds"
              content={`Contact Fly Jatt customer service for changes or cancellations to hotel bookings. If you fail to check in without prior notice, penalties may apply. Confirmation numbers can take up to 72 hours to be issued; we recommend reconfirming hotel reservations 24 hours before check-in.`}
            />
          </Box>

          <Box
            sx={{
              mt: 6,
            }}
          >
            <Section
              title="Disputing MBR Closure"
              content={`If you dispute the closure of an MBR, you must notify Fly Jatt by email within 12 hours of the denial notice. If accepted, Fly Jatt has 72 additional hours to locate your baggage. Bags marked as returned at the airport are considered final, with no further retrieval attempts.`}
            />
            <Section
              title="Additional Terms"
              content={`1. Baggage Eligibility: This Service Agreement applies only to mishandled baggage that has been tagged by the airline. Untagged bags do not qualify.
2. Return Coverage: The Agreement does not cover baggage returned within the service period, regardless of its condition.
3. Theft or Damage Claims: The Agreement excludes claims for theft or damage to baggage, even after its return.
4. Fraud Policy: Fly Jatt reserves the right to cancel the Agreement without obligations if fraud is detected. Fraud cases may be reported to authorities.
5. Agreement Terms: Instructions on mishandled baggage reports on the Fly Jatt website are part of this Agreement.
6. Service Period: Bags delivered to the designated destination within the service period are considered returned, fulfilling the Agreement terms.
7. Satisfaction Guarantee Limit: The Service Satisfaction Guarantee covers up to two bags per person, with only one payment per mishandled bag.
8. Payment Requirement: Passengers must complete payment for the Service Agreement to be eligible for coverage.
9. Baggage Claim Eligibility: Baggage claims issued by airports as Property Irregularity Reports (PIR), Baggage Irregularity Reports (BIR), or Lost Baggage Claim Forms do not qualify for satisfaction payments unless separately compensated by the airline, with proof of compensation.
10. Uncontrollable Delays: Fly Jatt is not liable for delays beyond its control, including security or customs issues, or if the Passenger fails to assist with retrieval efforts. Passengers must respond to retrieval requests within 12 hours to maintain eligibility.
11. Non-Refundable: This Service Agreement is non-refundable and non-transferable. Flight changes or cancellations require a new service purchase for newly booked flights.
12. Governing Law and Jurisdiction: This Agreement is governed by New York law, with disputes resolved exclusively in New York County courts. Third-party sellers are indemnified against legal claims related to mishandled baggage.
13. Data Sharing: Fly Jatt may share MBR data with the travel agency from which the service was purchased.`}
            />
            <Section
              title="Privacy Statement"
              content={`1. Privacy Commitment: Fly Jatt is committed to protecting your privacy and complies with applicable privacy laws, including GDPR. By purchasing services, you consent to data collection and processing.
2. Data Collection Consent: Using baggage services requires providing personal information, including your name, booking details, and contact information.
3. Data Use: Personal data is used solely for providing services and completing transactions requested by the Passenger.
4. Data Disclosure: Personal data is shared only with:
  • Airlines, travel agencies, and baggage handlers for service purposes, and these third parties are prohibited from using data for other purposes.
  • Legal authorities, if required by law or in urgent situations to protect Fly Jatt’s rights.
5. Privacy Policy Updates: Fly Jatt may update its privacy policy as needed to comply with regulations.
6. Data Retention and Deletion: Personal data is stored as long as necessary to fulfill transactions and may be kept for up to six months after service completion. Passengers may request data deletion by contacting privacy@flyjatt.com.`}
            />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default TermsConditions;
function Section({ title, content }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: "14px", fontWeight: "bold", mb: 1,
                color: "var(--primary-button)",

       }}>
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: "11px",
          textAlign: "justify"
        }}
      >
        {content}
      </Typography>
    </Box>
  );
}
