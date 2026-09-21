using Docker_Shamsi_Calendar.Models;
using Microsoft.Data.Sqlite;
using System.Globalization;

namespace Docker_Shamsi_Calendar.Services

{
    public class DatabaseService
    {
        private readonly string _connectionString;

        public DatabaseService()
        {
            string dataDirectory = OperatingSystem.IsWindows() ? AppContext.BaseDirectory : "/app/data";
            Directory.CreateDirectory(dataDirectory);
            _connectionString = $"Data Source={Path.Combine(dataDirectory, "calendar.db")}";
        }

        public void InitDb()
        {
            using var conn = new SqliteConnection(_connectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS Events (
                Id INTEGER PRIMARY KEY AUTOINCREMENT, Title TEXT NOT NULL, Year INTEGER NOT NULL,
                Month INTEGER NOT NULL, Day INTEGER NOT NULL, GregorianDate TEXT NOT NULL,
                IsHoliday INTEGER NOT NULL DEFAULT 0, IsCustom INTEGER NOT NULL DEFAULT 0
            );";
            cmd.ExecuteNonQuery();

            try
            {
                var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = "ALTER TABLE Events ADD COLUMN IsCustom INTEGER NOT NULL DEFAULT 0;";
                alterCmd.ExecuteNonQuery();
            }
            catch (SqliteException) { }
            try
            {
                var alterCmd2 = conn.CreateCommand();
                alterCmd2.CommandText = "ALTER TABLE Events ADD COLUMN IsPermanent INTEGER NOT NULL DEFAULT 0;";
                alterCmd2.ExecuteNonQuery();
            }
            catch (SqliteException) { }
        }

        public void SaveEvent(string title, int y, int m, int d, DateTime gDate, bool isHoliday, bool isCustom = false, bool isPermanent = false)
        {
            using var conn = new SqliteConnection(_connectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = @"
            INSERT INTO Events (Title, Year, Month, Day, GregorianDate, IsHoliday, IsCustom, IsPermanent)
            VALUES ($title, $y, $m, $d, $gdate, $isHoliday, $isCustom, $isPermanent);";
            cmd.Parameters.AddWithValue("$title", title);
            cmd.Parameters.AddWithValue("$y", y);
            cmd.Parameters.AddWithValue("$m", m);
            cmd.Parameters.AddWithValue("$d", d);
            cmd.Parameters.AddWithValue("$gdate", gDate.ToString("yyyy-MM-dd"));
            cmd.Parameters.AddWithValue("$isHoliday", isHoliday ? 1 : 0);
            cmd.Parameters.AddWithValue("$isCustom", isCustom ? 1 : 0);
            cmd.Parameters.AddWithValue("$isPermanent", isPermanent ? 1 : 0);
            cmd.ExecuteNonQuery();
        }

        public bool DeleteCustomEvent(int id)
        {
            using var conn = new SqliteConnection(_connectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM Events WHERE Id = $id AND IsCustom = 1;";
            cmd.Parameters.AddWithValue("$id", id);
            return cmd.ExecuteNonQuery() > 0;
        }

        public List<CalendarEvent> GetEventsForMonth(int y, int m)
        {
            return ExecuteQuery("SELECT Id, Title, Year, Month, Day, GregorianDate, IsHoliday, IsCustom, IsPermanent FROM Events WHERE Month = $m AND (Year = $y OR IsPermanent = 1);",
                new Dictionary<string, object> { { "$y", y }, { "$m", m } });
        }

        public List<CalendarEvent> GetEventsForIcs()
        {
            var pc = new PersianCalendar();
            int currentYear = pc.GetYear(DateTime.Now);
            return ExecuteQuery("SELECT Id, Title, Year, Month, Day, GregorianDate, IsHoliday, IsCustom, IsPermanent FROM Events WHERE (Year >= $min AND Year <= $max) OR IsPermanent = 1;",
                new Dictionary<string, object> { { "$min", currentYear - 1 }, { "$max", currentYear + 1 } });
        }

        public bool HasImportedEventsForYear(int year)
        {
            using var conn = new SqliteConnection(_connectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM Events WHERE Year = $year AND IsCustom = 0;";
            cmd.Parameters.AddWithValue("$year", year);
            return (long)cmd.ExecuteScalar() > 0;
        }

        public bool EventExists(string title, int y, int m, int d)
        {
            using var conn = new SqliteConnection(_connectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM Events WHERE Year = $y AND Month = $m AND Day = $d AND Title = $t;";
            cmd.Parameters.AddWithValue("$y", y);
            cmd.Parameters.AddWithValue("$m", m);
            cmd.Parameters.AddWithValue("$d", d);
            cmd.Parameters.AddWithValue("$t", title);
            return (long)cmd.ExecuteScalar() > 0;
        }

        private List<CalendarEvent> ExecuteQuery(string query, Dictionary<string, object> parameters)
        {
            var list = new List<CalendarEvent>();
            using var conn = new SqliteConnection(_connectionString);
            conn.Open();
            var cmd = conn.CreateCommand();
            cmd.CommandText = query;
            foreach (var param in parameters) cmd.Parameters.AddWithValue(param.Key, param.Value);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new CalendarEvent(reader.GetInt32(0), reader.GetString(1), reader.GetInt32(2), reader.GetInt32(3), reader.GetInt32(4), DateTime.Parse(reader.GetString(5)), reader.GetInt32(6) == 1, reader.GetInt32(7) == 1, reader.GetInt32(8) == 1));
            }
            return list;
        }
    }
}
