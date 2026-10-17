import { useRouter } from "next/router";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import jsPDF from "jspdf";
import {
  Box,
  Button,
  Heading,
  Spinner,
  TableContainer,
  Alert,
  AlertIcon,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { requestError } from "@/utils/requestError";

type PopularVenueReport = {
  venueId: string;
  venueName: string;
  successfulBookings: number;
  popularDay: string;
  popularTime: string;
};

type ActiveApplicantReport = {
  hirerId: string;
  hirerEmail: string;
  applicationsSubmitted: number;
  successfulBookings: number;
};

type ReportsData = {
  adminReports: {
    popularVenues: PopularVenueReport[];
    activeApplicants: ActiveApplicantReport[];
  };
};

const GET_ADMIN_REPORTS = gql`
  query GetAdminReports {
    adminReports {
      popularVenues {
        venueId
        venueName
        successfulBookings
        popularDay
        popularTime
      }
      activeApplicants {
        hirerId
        hirerEmail
        applicationsSubmitted
        successfulBookings
      }
    }
  }
`;

export default function Reports() {
  const router = useRouter();
  const { isAdmin, isCheckingAuth } = useRequireAdmin();

  const { data, loading, error } =
    useQuery<ReportsData>(GET_ADMIN_REPORTS, { skip: !isAdmin });

  const downloadReport = () => {
    if (!data) {
      return;
    }

    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Admin Reports", 20, 20);

    pdf.setFontSize(14);
    pdf.text("Top 3 Popular Venues", 20, 35);

    let yPosition = 45;

    for (const venue of data.adminReports.popularVenues) {
      pdf.setFontSize(11);
      pdf.text(`Venue: ${venue.venueName}`, 20, yPosition);
      yPosition += 7;

      pdf.text(
        `Successful bookings: ${venue.successfulBookings}`,
        20,
        yPosition
      );
      yPosition += 7;

      pdf.text(`Popular date: ${venue.popularDay}`, 20, yPosition);
      yPosition += 7;

      pdf.text(`Popular time: ${venue.popularTime}`, 20, yPosition);
      yPosition += 10;
    }

    yPosition += 5;

    pdf.setFontSize(14);
    pdf.text("Top 3 Active Applicants", 20, yPosition);

    yPosition += 10;

    for (const applicant of data.adminReports.activeApplicants) {
      pdf.setFontSize(11);
      pdf.text(`Applicant: ${applicant.hirerEmail}`, 20, yPosition);
      yPosition += 7;

      pdf.text(
        `Applications submitted: ${applicant.applicationsSubmitted}`,
        20,
        yPosition
      );
      yPosition += 7;

      pdf.text(
        `Successful bookings: ${applicant.successfulBookings}`,
        20,
        yPosition
      );
      yPosition += 10;
    }

    pdf.save("admin-reports.pdf");
  };

  if (isCheckingAuth || !isAdmin) {
    return <Spinner display="block" mx="auto" mt={12} />;
  }

  return (
    <Box maxW="1100px" mx="auto" py={{ base: 6, md: 10 }} px={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading>Reports</Heading>
          <Text mt={2}>
            View booking reports for venues and applicants.
          </Text>
        </Box>

        {loading && <Text as="div" role="status"><Spinner size="sm" mr={2} />Loading reports…</Text>}

        {error && (
          <Alert status="error" borderRadius="md"><AlertIcon />{requestError(error, "Could not load reports. Please try again.")}</Alert>
        )}

        {data && (
          <>
            <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }} bg="white" minW={0}>
              <Heading size="md" mb={3}>
                Top 3 Popular Venues
              </Heading>

              <Text display={{ base: "block", md: "none" }} fontSize="sm" color="gray.600" mb={2}>Scroll horizontally to view all columns.</Text>
              <TableContainer tabIndex={0} role="region" aria-label="Popular venues report, scroll horizontally">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Venue</Th>
                    <Th>Successful Bookings</Th>
                    <Th>Popular Date</Th>
                    <Th>Popular Time</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {data.adminReports.popularVenues.length === 0 && <Tr><Td colSpan={4} color="gray.600">No venue bookings to report yet.</Td></Tr>}
                  {data.adminReports.popularVenues.map((venue) => (
                    <Tr key={venue.venueId}>
                      <Td>{venue.venueName}</Td>
                      <Td>{venue.successfulBookings}</Td>
                      <Td>{venue.popularDay}</Td>
                      <Td>{venue.popularTime}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              </TableContainer>
            </Box>

            <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }} bg="white" minW={0}>
              <Heading size="md" mb={3}>
                Top 3 Active Applicants
              </Heading>

              <Text display={{ base: "block", md: "none" }} fontSize="sm" color="gray.600" mb={2}>Scroll horizontally to view all columns.</Text>
              <TableContainer tabIndex={0} role="region" aria-label="Active applicants report, scroll horizontally">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Applicant</Th>
                    <Th>Applications Submitted</Th>
                    <Th>Successful Bookings</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {data.adminReports.activeApplicants.length === 0 && <Tr><Td colSpan={3} color="gray.600">No applicant activity to report yet.</Td></Tr>}
                  {data.adminReports.activeApplicants.map((applicant) => (
                    <Tr key={applicant.hirerId}>
                      <Td>{applicant.hirerEmail}</Td>
                      <Td>{applicant.applicationsSubmitted}</Td>
                      <Td>{applicant.successfulBookings}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              </TableContainer>
            </Box>

            <Button onClick={downloadReport}>
              Download Report as PDF
            </Button>
          </>
        )}

        <Button alignSelf="flex-start" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </VStack>
    </Box>
  );
}
