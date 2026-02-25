function handlePost(e){

  if(isLoginRequest(e))
    return handleLogin(e);

  if(!isAuthorized(e))
    return textResponse("Unauthorized");

  const mode = e.parameter.mode || "order";

  if(mode==="order") return saveOrder(e);
  if(mode==="expense") return saveExpense(e);
  if(mode==="attendance") return saveAttendance(e);
  if(mode==="booking") return saveBooking(e);

  return textResponse("Invalid mode");
}