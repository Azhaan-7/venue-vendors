import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./data-source";
import userRoutes from "./routes/userRoutes";
import profileRoutes from "./routes/profileRoutes";
import cors from "cors";
//api for applications
import applicationRoutes from "./routes/applicationRoutes";
import blockedPeriodRoutes from "./routes/blockedPeriodRoutes";
import hireHistoryRoutes from "./routes/hireHistoryRoutes";
import venueRoutes from "./routes/venueRoutes";
import hirerDocumentRoutes from "./routes/HirerDocumentRoutes";
import applicationDraftRoutes from "./routes/applicationDraftRoutes";
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api", hireHistoryRoutes);
app.use("/api", userRoutes);
app.use("/api", profileRoutes);
app.use("/api", applicationRoutes);
app.use("/api", blockedPeriodRoutes);
app.use("/api", venueRoutes);
app.use("/api", hirerDocumentRoutes);
app.use("/api", applicationDraftRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) =>
    console.log("Error during Data Source initialization:", error)
  );
