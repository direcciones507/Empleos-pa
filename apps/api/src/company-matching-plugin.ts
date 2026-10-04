import type {FastifyInstance} from "fastify";
import {companyMatchingRoutes} from "./company-matching-routes.js";

/**
 * Registration shim kept separate so the company matching flow can be
 * mounted explicitly by the API bootstrap without exposing provider secrets
 * or duplicating the matching implementation.
 */
export async function registerCompanyMatching(app:FastifyInstance){
  await companyMatchingRoutes(app);
}
