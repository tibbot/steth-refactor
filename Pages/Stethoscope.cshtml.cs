using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using System.Text.Json;
using System.Security.Cryptography.X509Certificates;
using System.Data.Common;
using CoreBackend;
using CoreBackend.Interfaces;
using CoreBackend.Models;


namespace Stethoscope.Pages
{
public class InkModel : PageModel
{
  private readonly ICoreServiceApi _api;

  public InkModel(ICoreServiceApi api)
  {
    _api = api;
  }

  public Task<JsonResult> OnPostLoginAsync([FromBody] LoginCredentials creds)
    => Task.FromResult(new JsonResult(_api.AuthenticateAsync(creds)));

  public async Task<JsonResult> OnPostParameterSQLAsync([FromBody] StoredProcedureRequest req)
  {
    var list = await _api.ExecuteListAsync(req);
    return new JsonResult(list);
  }

  public async Task<JsonResult> OnPostTableSQLAsync([FromBody] TableRequest req)
  {
    var html = await _api.ExecuteHtmlAsync(req);
    return new JsonResult(html);
  }

  public async Task<JsonResult> OnGetGenericSQLAsync(string spName)
  {
    var list = await _api.ExecuteGenericAsync(spName);
    return new JsonResult(list);
  }
}

}