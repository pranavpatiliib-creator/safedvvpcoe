-- Demo seed data for:
-- Event: SQL PPT Presentation
-- Registration style: Group event
-- Questions: Group Name, Group Members
-- Total students: 50

begin;

with inserted_event as (
    insert into public.events (title, description, date, flyer_url)
    values (
        'SQL PPT Presentation',
        'Group presentation event on SQL for 50 students. Each team registers with a group name and member names.',
        now() + interval '7 day',
        null
    )
    returning id
),
inserted_questions as (
    insert into public.questions (event_id, question, type, options, required)
    select
        e.id,
        q.question,
        q.type,
        q.options,
        q.required
    from inserted_event e
    cross join (
        values
            ('Group Name', 'text', null::text[], true),
            ('Group Members', 'group_members', array['5']::text[], true)
    ) as q(question, type, options, required)
    returning id, event_id, question
),
question_map as (
    select
        event_id,
        max(case when lower(question) = 'group name' then id end) as group_name_qid,
        max(case when lower(question) = 'group members' then id end) as group_members_qid
    from inserted_questions
    group by event_id
)
insert into public.responses (event_id, answers)
select
    qm.event_id,
    jsonb_build_object(
        qm.group_name_qid::text, teams.group_name,
        qm.group_members_qid::text, jsonb_build_object(
            'group_size', '5',
            'member_names', teams.member_names
        )
    )
from question_map qm
cross join (
    values
        ('SQL Masters', '["Aarav Patil","Ishita Shinde","Vedant Jadhav","Sai Joshi","Pranali Bhosale"]'::jsonb),
        ('Query Queens', '["Omkar Kale","Rutuja Pawar","Atharva More","Sneha Chavan","Yash Deshmukh"]'::jsonb),
        ('Data Dynamos', '["Tanvi Gaikwad","Rohit Kharat","Anushka Kulkarni","Soham Doke","Tejaswini Kute"]'::jsonb),
        ('Schema Squad', '["Nikhil Thorat","Sakshi Wagh","Aditya Shete","Pooja Auti","Shreyas Nagare"]'::jsonb),
        ('Table Titans', '["Mrunal Lanke","Harshad Pansare","Vaishnavi Rode","Kunal Gadekar","Shravani Gorde"]'::jsonb),
        ('Code Crafters', '["Siddharth Kolhe","Aditi Ghule","Pratiksha Tambe","Abhishek Gite","Neha Dhumal"]'::jsonb),
        ('Join Junction', '["Mayur Shelke","Kalyani Aher","Saurabh Bende","Komal Kakde","Ritesh Mhaske"]'::jsonb),
        ('Null Ninjas', '["Pallavi Hase","Akshay Tupe","Aishwarya Khedkar","Rushikesh Gawali","Dipali Dhakne"]'::jsonb),
        ('Database Wizards', '["Aniket Lawande","Sonal Borude","Tushar Kute","Prajakta Bagul","Swapnil Dhomse"]'::jsonb),
        ('Primary Keys', '["Rasika Chothe","Shubham Munde","Monali Sonawane","Ganesh Pawar","Priyanka Karale"]'::jsonb)
) as teams(group_name, member_names);

commit;
