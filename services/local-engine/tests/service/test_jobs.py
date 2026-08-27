import threading
import time
import unittest

from opace_integrity.jobs import JobStore, LEGAL_TRANSITIONS, PIPELINE_STATES, TERMINAL_STATES


class JobRaceTests(unittest.TestCase):
    def test_exact_spec04_transition_graph_rejects_every_other_edge(self):
        states=set(PIPELINE_STATES)|{"cancelling"}|set(TERMINAL_STATES)
        for source in states:
            for target in states|{"invented"}:
                store=JobStore();timestamp="2026-08-26T10:00:00.000Z";store._jobs["job_test"]={"state":source,"updated_at":timestamp,"transitions":[]}
                accepted=store._transition("job_test",target,"test")
                expected=target in LEGAL_TRANSITIONS.get(source,frozenset())
                self.assertEqual(accepted,expected,f"{source} -> {target}")
                self.assertEqual(store._jobs["job_test"]["state"],target if expected else source)
                self.assertEqual(len(store._jobs["job_test"]["transitions"]),1 if expected else 0)

    def test_linear_pipeline_has_no_skips_backwards_or_self_transitions(self):
        for index,state in enumerate(PIPELINE_STATES[:-1]):
            self.assertIn(PIPELINE_STATES[index+1],LEGAL_TRANSITIONS[state])
            self.assertNotIn(state,LEGAL_TRANSITIONS[state])
            self.assertTrue(set(PIPELINE_STATES[:index+1]).isdisjoint(LEGAL_TRANSITIONS[state]))
            self.assertTrue(set(PIPELINE_STATES[index+2:]).isdisjoint(LEGAL_TRANSITIONS[state]))
        self.assertEqual(LEGAL_TRANSITIONS["cancelling"],{"cancelled"})
        for state in TERMINAL_STATES:self.assertNotIn(state,LEGAL_TRANSITIONS)

    def test_cancelled_job_cannot_transition_backwards(self):
        store=JobStore();paused=threading.Event();resume=threading.Event();original=store._transition
        def transition(job_id,state,message,error=None):
            result=original(job_id,state,message,error)
            if state=="validating": paused.set();resume.wait(2)
            return result
        store._transition=transition
        request={"request_id":"req_test001","source":{"content":"secret"}}
        job,_=store.create(request,"idem-test001")
        self.assertTrue(paused.wait(2));self.assertTrue(store.cancel(job["job_id"]));resume.set()
        for _ in range(50):
            if store.get(job["job_id"])["state"]=="cancelled": break
            time.sleep(.01)
        value=store.get(job["job_id"])
        self.assertEqual(value["state"],"cancelled")
        states=[item["state"] for item in value["transitions"]]
        self.assertEqual(states[-1],"cancelled")
        self.assertNotIn("failed",states[states.index("cancelled")+1:])
        self.assertNotIn(job["job_id"],store._payloads)

    def test_ids_are_random_idempotent_and_terminal_payload_is_deleted(self):
        request={"request_id":"req_test001","source":{"content":"private source marker"}}
        first=JobStore();job,_=first.create(request,"idem-test001");same,created=first.create(request,"idem-test001")
        self.assertFalse(created);self.assertEqual(same["job_id"],job["job_id"])
        second=JobStore();other,_=second.create(request,"idem-test001");self.assertNotEqual(other["job_id"],job["job_id"])
        for store,value in ((first,job),(second,other)):
            for _ in range(100):
                if store.get(value["job_id"])["state"]=="failed":break
                time.sleep(.01)
            self.assertNotIn(value["job_id"],store._payloads)

    def test_shutdown_clears_payloads_and_interrupts_active_jobs(self):
        store=JobStore();paused=threading.Event();resume=threading.Event();original=store._transition
        def transition(job_id,state,message,error=None):
            result=original(job_id,state,message,error)
            if state=="validating":paused.set();resume.wait(2)
            return result
        store._transition=transition
        job,_=store.create({"request_id":"req_test001","source":{"content":"private source marker"}},"idem-test001")
        self.assertTrue(paused.wait(2));store.shutdown();resume.set();self.assertEqual(store.get(job["job_id"])["state"],"interrupted");self.assertEqual(store._payloads,{})


if __name__ == "__main__": unittest.main()
