import {afterEach,describe,expect,it,vi} from "vitest";
import {api} from "./api";

describe("api candidate submit",()=>{
  afterEach(()=>vi.restoreAllMocks());
  it("treats an already submitted candidate profile as success",async()=>{
    const fetchMock=vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({error:"PROFILE_ALREADY_SUBMITTED"}),{status:409,headers:{"content-type":"application/json"}}))
      .mockResolvedValueOnce(new Response(JSON.stringify({profile:{candidate_code:"EMP-000001",status:"ACTIVO"}}),{status:200,headers:{"content-type":"application/json"}}));
    const result=await api("/v1/candidate/profile/submit",{method:"POST",body:"{}"});
    expect(result.profile.candidate_code).toBe("EMP-000001");
    expect(result.already_submitted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
