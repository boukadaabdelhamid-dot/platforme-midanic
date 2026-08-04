import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import blogRouter from "./blog";
import contactRouter from "./contact";
import profileRouter from "./profile";
import statsRouter from "./stats";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(blogRouter);
router.use(contactRouter);
router.use(profileRouter);
router.use(statsRouter);
router.use(adminRouter);

export default router;
