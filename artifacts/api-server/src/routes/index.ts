import { Router, type IRouter } from "express";
import healthRouter from "./health";
import moviesRouter from "./movies";
import statsRouter from "./stats";
import adminRouter from "./admin";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moviesRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use(uploadRouter);

export default router;
