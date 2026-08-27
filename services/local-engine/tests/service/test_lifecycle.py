import http.client
import os
import socket
import subprocess
import sys
import time
import unittest


RUN="run-token-lifecycle-123";ADMIN="admin-token-lifecycle-456"


class LifecycleTests(unittest.TestCase):
    def child_environment(self,pid):
        if sys.platform.startswith("linux"):
            return open(f"/proc/{pid}/environ","rb").read().decode("utf-8","replace")
        result=subprocess.run(["ps","eww","-p",str(pid),"-o","command="],capture_output=True,text=True,check=True)
        return result.stdout

    def test_sigterm_stops_listener_without_secret_or_traceback(self):
        probe=socket.socket();probe.bind(("127.0.0.1",0));port=probe.getsockname()[1];probe.close()
        process=subprocess.Popen([sys.executable,"-m","opace_integrity","serve","--port",str(port)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={**os.environ,"OACI_RUN_TOKEN":RUN,"OACI_ADMIN_TOKEN":ADMIN})
        try:
            for _ in range(50):
                try:
                    connection=http.client.HTTPConnection("127.0.0.1",port,timeout=.2);connection.request("GET","/health");response=connection.getresponse();response.read();connection.close()
                    if response.status==200:break
                except OSError:time.sleep(.05)
            else:self.fail("service did not become ready")
            environment=self.child_environment(process.pid)
            for marker in (RUN,ADMIN):self.assertNotIn(marker,environment)
            connection=http.client.HTTPConnection("127.0.0.1",port,timeout=1);connection.request("GET","/v1/capabilities",headers={"Authorization":"Bearer "+RUN});response=connection.getresponse();response.read();connection.close();self.assertEqual(response.status,200)
            process.terminate();stdout,stderr=process.communicate(timeout=3);self.assertEqual(process.returncode,0);self.assertEqual(stdout,"")
            for marker in (RUN,ADMIN,"Traceback"):self.assertNotIn(marker,stderr)
            with self.assertRaises(OSError):socket.create_connection(("127.0.0.1",port),timeout=.2)
        finally:
            if process.poll() is None:process.kill();process.wait(2)


if __name__=="__main__":unittest.main()
